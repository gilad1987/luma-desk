// @vitest-environment jsdom
/**
 * A beam with real values can still hold single GDTF defaults the writer never set (Beam table: LampType Discharge,
 * ColorTemperature 6000, LuminousFlux 10000, angles 25, ColorRenderingIndex 100). Each is dropped unless something
 * in the file confirms it, and the drop is reported.
 */
import { describe, expect, it } from 'vitest';
import { gdtfFunctionMode, opticsOf } from '../../shared/index.ts';

const body = (beam: string): string => `<Geometry Name="Body"><Beam Name="Beam" ${beam}/></Geometry>`;
const DIM = gdtfFunctionMode('Std', [{ attribute: 'Dimmer', offset: '1' }]);
const RGB = gdtfFunctionMode(
  'Std',
  ['R', 'G', 'B'].map((letter, index) => ({ attribute: `ColorAdd_${letter}`, offset: `${index + 1}` })),
);
const output = (beam: string, modes = DIM): ReturnType<typeof opticsOf> => opticsOf({ geometries: body(beam), modes });

describe('single GDTF defaults in a beam with real values', () => {
  it('drops a CRI of 100 unless the lamp is tungsten or halogen', () => {
    const led = output('BeamAngle="20" LampType="LED" ColorRenderingIndex="100"');
    expect(led.optics?.output?.cri).toBeUndefined();
    expect(led.drops).toEqual([{ part: 'cri', reason: 'loneDefault' }]);
    expect(output('BeamAngle="20" ColorRenderingIndex="100"').optics?.output?.cri).toBeUndefined();
    expect(output('BeamAngle="20" LampType="Halogen" ColorRenderingIndex="100"').optics?.output?.cri).toBe(100);
    expect(output('BeamAngle="20" LampType="Tungsten" ColorRenderingIndex="100"').optics?.output?.cri).toBe(100);
    expect(output('BeamAngle="20" LampType="LED" ColorRenderingIndex="95"').optics?.output?.cri).toBe(95);
  });

  it('drops LampType Discharge on a mode with additive emitters, and keeps it without them', () => {
    const rgb = output('BeamAngle="20" LampType="Discharge"', RGB);
    expect(rgb.optics?.output?.lampType).toBeUndefined();
    expect(rgb.drops).toEqual([{ part: 'lampType', reason: 'loneDefault' }]);
    expect(output('BeamAngle="20" LampType="Discharge"').optics?.output?.lampType).toBe('Discharge');
    expect(output('BeamAngle="20" LampType="LED"', RGB).optics?.output?.lampType).toBe('LED');
  });

  it('drops 6000 K only when the lamp type was dropped as a default', () => {
    const rgb = output('BeamAngle="20" LampType="Discharge" ColorTemperature="6000"', RGB);
    expect(rgb.optics?.output?.colorTemperature).toBeUndefined();
    expect(rgb.drops).toEqual([
      { part: 'lampType', reason: 'loneDefault' },
      { part: 'colorTemperature', reason: 'loneDefault' },
    ]);
    const kept = output('BeamAngle="20" LampType="Discharge" ColorTemperature="6000"');
    expect(kept.optics?.output?.colorTemperature).toBe(6000);
    const real = output('BeamAngle="20" LampType="Discharge" ColorTemperature="6500"', RGB);
    expect(real.optics?.output?.colorTemperature).toBe(6500);
  });

  it('drops a flux of 10000 lm when both angles are 25 degrees, written or left at the default', () => {
    const both = output('BeamAngle="25" FieldAngle="25" LuminousFlux="10000" PowerConsumption="300"');
    expect(both.optics?.output).toEqual({ powerConsumption: 300, beamCount: 1, pixelControl: false });
    expect(both.drops).toEqual([{ part: 'flux', reason: 'loneDefault' }]);
    const unwritten = output('LuminousFlux="10000" PowerConsumption="300"');
    expect(unwritten.optics?.output?.luminousFlux).toBeUndefined();
    const field = output('BeamAngle="25" FieldAngle="30" LuminousFlux="10000"');
    expect(field.optics?.output?.luminousFlux).toBe(10000);
  });
});
