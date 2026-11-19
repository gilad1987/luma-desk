// @vitest-environment jsdom
/**
 * Zoom, the fixed optics of the `Beam` geometry and the output come from the GDTF as written: a missing attribute
 * stays absent, and a beam of GDTF default values is not believed. A pixel bar counts one beam per reference.
 */
import { describe, expect, it } from 'vitest';
import { gdtfFunctionMode, opticsOf } from '../../shared/index.ts';

const body = (beam: string): string => `<Geometry Name="Body"><Beam Name="Beam" ${beam}/></Geometry>`;
const REAL =
  'BeamType="Spot" BeamAngle="45" FieldAngle="47" BeamRadius="0.055" LuminousFlux="12000" PowerConsumption="310" ' +
  'ColorTemperature="6700" ColorRenderingIndex="90" LampType="LED" RectangleRatio="1.7777" ThrowRatio="1"';
const DEFAULTS = 'BeamType="Wash" BeamAngle="25" FieldAngle="25" LuminousFlux="10000" ColorTemperature="6000"';
const zoom = (fn: string): string => gdtfFunctionMode('Std', [{ attribute: 'Zoom', offset: '1,2', fn }]);
const DIM = gdtfFunctionMode('Std', [{ attribute: 'Dimmer', offset: '1' }]);
const reference = (index: number): string =>
  `<GeometryReference Name="P${index}" Geometry="Pixel"><Break DMXBreak="1" DMXOffset="${index * 3 + 1}"/>` +
  '</GeometryReference>';
const BAR =
  `<Geometry Name="Body">${[0, 1, 2, 3].map(reference).join('')}</Geometry>` +
  '<Geometry Name="Pixel"><Beam Name="LED" BeamType="Wash" BeamAngle="30" LuminousFlux="600"/></Geometry>';
const BAR_MODE = gdtfFunctionMode(
  'Std',
  ['R', 'G', 'B'].map((letter, index) => ({
    attribute: `ColorAdd_${letter}`,
    offset: `${index + 1}`,
    geometry: 'Pixel',
  })),
);

describe('zoom, beam and output from a GDTF', () => {
  it('reads the zoom range in degrees with the file order and its 16-bit slots', () => {
    const { optics } = opticsOf({ modes: zoom('PhysicalFrom="48" PhysicalTo="8"') });
    expect(optics?.zoom).toMatchObject({ from: 48, to: 8, dmxTo: 65535, drives: [{ dmxBreak: 1, offset: [1, 2] }] });
  });

  it.each([
    ['PhysicalFrom="0" PhysicalTo="0"', 'noRange'],
    ['PhysicalFrom="0" PhysicalTo="60"', 'outOfRange'],
    ['PhysicalFrom="5" PhysicalTo="200"', 'outOfRange'],
  ] as const)('drops the zoom range %s', (fn, reason) => {
    expect(opticsOf({ modes: zoom(fn) })).toEqual({ drops: [{ part: 'zoom', reason }] });
  });

  it('reads the written beam and output values, and a rectangle ratio only on a rectangle beam', () => {
    const { optics, drops } = opticsOf({ geometries: body(REAL), modes: zoom('') });
    expect(optics?.beam).toEqual({ beamType: 'Spot', beamAngle: 45, fieldAngle: 47, beamRadius: 0.055 });
    expect(optics?.output).toEqual({
      luminousFlux: 12000,
      powerConsumption: 310,
      colorTemperature: 6700,
      cri: 90,
      lampType: 'LED',
      beamCount: 1,
      pixelControl: false,
    });
    expect(drops).toEqual([{ part: 'zoom', reason: 'missing' }]);
    const rectangle = opticsOf({
      geometries: body('BeamType="Rectangle" RectangleRatio="1.6" ThrowRatio="1.2"'),
      modes: DIM,
    });
    expect(rectangle.optics?.beam).toEqual({ beamType: 'Rectangle', rectangleRatio: 1.6, throwRatio: 1.2 });
  });

  it('does not believe a beam of GDTF default values, a zero flux or an angle that is none', () => {
    const defaults = opticsOf({ geometries: body(DEFAULTS), modes: zoom('') });
    expect(defaults.optics).toEqual({ output: { beamCount: 1, pixelControl: false } });
    expect(defaults.drops).toContainEqual({ part: 'beam', reason: 'specDefaults' });
    const odd = opticsOf({ geometries: body('BeamAngle="0" FieldAngle="12" LuminousFlux="0"'), modes: DIM });
    expect(odd.optics?.beam).toEqual({ fieldAngle: 12 });
    expect(odd.optics?.output?.luminousFlux).toBeUndefined();
    expect(odd.drops).toEqual([
      { part: 'flux', reason: 'zero' },
      { part: 'beamAngle', reason: 'outOfRange' },
    ]);
    const evidence = opticsOf({ geometries: body('BeamAngle="12" LuminousFlux="10000"'), modes: DIM });
    expect(evidence.optics?.output?.luminousFlux).toBe(10000);
    // with both angles at their default 25 nothing shows the flux is real
    const lone = opticsOf({
      geometries: body('BeamAngle="25" LuminousFlux="10000" PowerConsumption="300"'),
      modes: DIM,
    });
    expect(lone.optics?.output?.luminousFlux).toBeUndefined();
  });

  it('counts the beams of a pixel bar and gives every pixel its own DMX slot', () => {
    const { optics } = opticsOf({ geometries: BAR, modes: BAR_MODE });
    expect(optics?.output).toEqual({ luminousFlux: 600, beamCount: 4, pixelControl: true });
    expect(optics?.color?.emitters?.map((emitter) => emitter.attribute)).toEqual([
      'ColorAdd_R',
      'ColorAdd_G',
      'ColorAdd_B',
    ]);
    expect(optics?.color?.emitters?.[1]?.drives.map((drive) => drive.offset)).toEqual([[2], [5], [8], [11]]);
  });
});
