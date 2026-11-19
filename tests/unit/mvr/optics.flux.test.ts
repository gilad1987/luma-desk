// @vitest-environment jsdom
/**
 * A luminous flux is kept only when its lamp type can give it from the power the same beam states, and a pixel bar
 * that writes the whole bar's flux on every beam gets the flux of one beam.
 */
import { describe, expect, it } from 'vitest';
import { TYPES } from '../../../src/domain/fixtureTypes/index.ts';
import { opticsLines } from '../../../src/mvr/import/opticsLines.ts';
import { gdtfFunctionMode, opticsOf } from '../../shared/index.ts';

const DIM = gdtfFunctionMode('Std', [{ attribute: 'Dimmer', offset: '1' }]);
const body = (beam: string): string => `<Geometry Name="Body"><Beam Name="Beam" BeamAngle="20" ${beam}/></Geometry>`;
const flux = (lamp: string, lumens: number, watts: number): string =>
  `LampType="${lamp}" LuminousFlux="${lumens}" PowerConsumption="${watts}"`;
/** `count` pixel geometries, each with its own `Beam` that writes the same values. */
const bar = (count: number, beam: string): string =>
  '<Geometry Name="Body">' +
  Array.from(
    { length: count },
    (_, index) => `<Geometry Name="P${index}"><Beam Name="B${index}" ${beam}/></Geometry>`,
  ).join('') +
  '</Geometry>';

describe('the plausibility of the luminous flux', () => {
  it('drops 120,000 lm from a 500 W LED and says why', () => {
    const { optics, drops } = opticsOf({ geometries: body(flux('LED', 120000, 500)), modes: DIM });
    expect(optics?.output?.luminousFlux).toBeUndefined();
    expect(optics?.output?.powerConsumption).toBe(500);
    expect(drops).toEqual([{ part: 'flux', reason: 'implausible' }]);
  });

  it('keeps 20,375 lm from a 470 W discharge lamp', () => {
    const { optics, drops } = opticsOf({ geometries: body(flux('Discharge', 20375, 470)), modes: DIM });
    expect(optics?.output?.luminousFlux).toBe(20375);
    expect(drops).toEqual([]);
  });

  it('keeps a high flux when the power is the GDTF default, which says nothing about the lamp', () => {
    const { optics } = opticsOf({ geometries: body(flux('Tungsten', 40000, 1000)), modes: DIM });
    expect(optics?.output?.luminousFlux).toBe(40000);
  });

  it('applies the limit of the lamp type: 110 lm/W discharge, 35 lm/W tungsten and halogen', () => {
    const at = (lamp: string, lumens: number): number | undefined =>
      opticsOf({ geometries: body(flux(lamp, lumens, 100)), modes: DIM }).optics?.output?.luminousFlux;
    expect([at('Discharge', 11000), at('Discharge', 11100), at('Halogen', 3500), at('Tungsten', 3600)]).toEqual([
      11000,
      undefined,
      3500,
      undefined,
    ]);
  });

  it('divides the flux of a bar that writes the whole bar on each of 16 beams of 45 W', () => {
    // 8,959 lm from 45 W is 199 lm/W, above the LED limit; 8,959 lm from 16 * 45 W is 12 lm/W: the bar's flux
    const { optics, drops } = opticsOf({ geometries: bar(16, flux('LED', 8959, 45)), modes: DIM });
    expect(optics?.output?.beamCount).toBe(16);
    expect(optics?.output?.luminousFlux).toBeCloseTo(8959 / 16, 6);
    expect(drops).toEqual([]);
  });

  it('keeps a per-beam flux that is plausible as written, and drops one that no reading makes plausible', () => {
    const plausible = opticsOf({ geometries: bar(16, flux('LED', 600, 5)), modes: DIM });
    expect(plausible.optics?.output?.luminousFlux).toBe(600);
    const impossible = opticsOf({ geometries: bar(4, flux('LED', 9000, 10)), modes: DIM });
    expect(impossible.optics?.output?.luminousFlux).toBeUndefined();
    expect(impossible.drops).toEqual([{ part: 'flux', reason: 'implausible' }]);
  });

  it('names the count of fixtures with a dropped flux in one summary line, and that the desk default is used', () => {
    const verdict = opticsOf({ geometries: body(flux('LED', 120000, 500)), modes: DIM });
    const entry = { product: 'Nova Wash', type: 'wash' as const, verdict: { ...verdict, drops: [...verdict.drops] } };
    expect(opticsLines([entry, entry]).map((line) => line.message)).toEqual([
      '2 fixtures of "Nova Wash": optics comes from the GDTF; not used: luminous flux (more lumens per watt than the ' +
        `lamp type can give); desk defaults for type ${TYPES.wash.name} are used for the rest.`,
    ]);
  });
});
