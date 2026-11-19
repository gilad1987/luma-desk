import { describe, expect, it } from 'vitest';
import * as p from '../../../../src/render/photometry';
import { COLOUR_CASES } from './nonFiniteColour';
import { LIGHT_CASES } from './nonFiniteCases';

const CASES = { ...LIGHT_CASES, ...COLOUR_CASES };
const BAD = [NaN, Infinity, -Infinity, 0, -1];
/** The unit markers: the one documented exception, they let Infinity through. */
const BRANDS: Readonly<Record<string, (v: number) => number>> = {
  lumens: p.lumens,
  candela: p.candela,
  lux: p.lux,
  nits: p.nits,
};

/** Every number in a result: a number, the items of an array, the fields of an object. */
function numbersIn(value: unknown): number[] {
  if (typeof value === 'number') return [value];
  if (Array.isArray(value)) return value.flatMap(numbersIn);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(numbersIn);
  return [];
}

describe('photometry input policy: NaN, Infinity, 0 and negative inputs', () => {
  it('has a case for every function the module exports', () => {
    const exported = Object.entries(p)
      .filter(([, value]) => typeof value === 'function')
      .map(([name]) => name);
    expect([...Object.keys(CASES), ...Object.keys(BRANDS)].sort()).toEqual(exported.sort());
  });

  it.each(Object.entries(BRANDS))('%s turns NaN into 0 and keeps Infinity (documented: "no limit")', (_, brand) => {
    expect(brand(NaN)).toBe(0);
    expect(brand(Infinity)).toBe(Infinity);
    expect(brand(-2)).toBe(-2);
  });

  it.each(Object.entries(CASES))('%s gives only finite numbers', (_name, [call, base]) => {
    for (const bad of BAD) {
      for (let i = 0; i <= base.length; i++) {
        // one argument bad at a time, then all of them at once
        const args = base.map((value, j) => (i === base.length || i === j ? bad : value));
        for (const value of numbersIn(call(args))) expect(value, `argument ${i} = ${bad}`).toSatisfy(Number.isFinite);
      }
    }
  });

  it('gives the named results', () => {
    expect(p.emittedFlux(1000, NaN)).toBe(0);
    expect(p.illuminance(p.candela(1000), NaN)).toBe(0);
    expect(p.illuminance(p.candela(1000), Infinity)).toBe(0);
    expect(p.profileAt(p.resolveBeamProfile(10, 18), NaN)).toBe(0);
    expect(p.cctToXy(NaN)).toEqual(p.cctToXy(6500));
    expect(p.zoomAt({ narrowFieldDeg: 10, wideFieldDeg: 40, beamToField: 0.5 }, NaN, p.lumens(1)).fieldAngleDeg).toBe(
      10,
    );
    expect(p.lensLuminance(p.candela(1000), NaN, p.nits(1e9))).toBe(0);
    expect(p.apexOffset(0.05, NaN)).toBe(0);
    expect(p.ev100(2.8, 0, 800)).toBe(0);
    expect(p.ev100(2.8, 0.02, 0)).toBe(0);
    // the whole line: pi / h; half of it from the foot: pi / (2 h); h = 2
    expect(p.inverseSquareIntegral(2, 0, -Infinity, Infinity)).toBeCloseTo(Math.PI / 2, 12);
    expect(p.inverseSquareIntegral(2, 0, 0, Infinity)).toBeCloseTo(Math.PI / 4, 12);
    expect(p.inverseSquareIntegral(2, 3, 0, Infinity)).toBeCloseTo((Math.PI / 2 - Math.atan(1.5)) / 2, 12);
  });
});
