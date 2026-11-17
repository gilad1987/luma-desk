import { describe, expect, it } from 'vitest';
import { D2R, clamp, jsonClone, lerp } from '../../../src/core/index.ts';
import { PARITY_INPUTS_SMALL, parityMismatches, triples } from './parityInputs.ts';

// Reference oracles: the original one-liners from index.html (48a3b63, lines 687-689),
// formatted by Prettier, with types added only.
const clampOracle = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerpOracle = (a: number, b: number, t: number) => a + (b - a) * t;
const deepOracle = (o: unknown): unknown => JSON.parse(JSON.stringify(o));

describe('clamp', () => {
  it('matches the original expression for every edge triple, including NaN, -0 and inverted bounds', () => {
    expect(parityMismatches(triples(PARITY_INPUTS_SMALL), clamp, clampOracle)).toEqual([]);
  });

  it('passes a NaN value through instead of returning a bound', () => {
    expect(clamp(NaN, 0, 1)).toBeNaN();
  });
});

describe('lerp', () => {
  it('matches the original expression for every edge triple', () => {
    expect(parityMismatches(triples(PARITY_INPUTS_SMALL), lerp, lerpOracle)).toEqual([]);
  });
});

describe('D2R', () => {
  it('is exactly Math.PI / 180', () => {
    expect(D2R).toBe(Math.PI / 180);
  });
});

describe('jsonClone', () => {
  const show = {
    name: 'show',
    gone: undefined,
    nan: NaN,
    cues: [
      { id: 2, vals: { 101: { dim: 100, r: -0 } } },
      { id: 1, fade: Infinity },
    ],
    when: new Date(0),
  };

  it('gives the same structure as the original JSON round trip', () => {
    expect(JSON.stringify(jsonClone(show))).toBe(JSON.stringify(deepOracle(show)));
    expect(jsonClone(show)).toStrictEqual(deepOracle(show));
  });

  it('drops undefined members, keeps key order and returns new objects', () => {
    const copy = jsonClone(show);
    expect(Object.keys(copy)).toEqual(['name', 'nan', 'cues', 'when']);
    expect(copy.nan).toBeNull();
    expect(copy.cues).not.toBe(show.cues);
    expect(copy.cues[0]).not.toBe(show.cues[0]);
  });

  it('throws for a top-level undefined, as the original did', () => {
    expect(() => jsonClone(undefined)).toThrow(SyntaxError);
    expect(() => deepOracle(undefined)).toThrow(SyntaxError);
  });
});
