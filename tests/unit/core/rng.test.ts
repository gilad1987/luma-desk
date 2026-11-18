import { describe, expect, it } from 'vitest';
import { hash, rng } from '../../../src/core/index.ts';
import { PARITY_INPUTS, parityMismatches } from './parityInputs.ts';

// Reference oracles: the original one-liners from index.html (48a3b63, lines 693 and 1229),
// formatted by Prettier, with types added only.
const hashOracle = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function rngOracle(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STREAM_LENGTH = 500;
const take = (next: () => number): number[] => Array.from({ length: STREAM_LENGTH }, next);

describe('hash', () => {
  it('matches the original expression for every input, including NaN and infinities', () => {
    const inputs = PARITY_INPUTS.map((n): [number] => [n]);
    expect(parityMismatches(inputs, hash, hashOracle)).toEqual([]);
  });

  it('matches the inputs the flash effect uses (step * 13.7 + id * 3.1)', () => {
    const inputs = Array.from({ length: 400 }, (_, i): [number] => [(i % 40) * 13.7 + (101 + i) * 3.1]);
    expect(parityMismatches(inputs, hash, hashOracle)).toEqual([]);
  });
});

describe('rng', () => {
  it('gives the same stream as the original for every seed, including NaN, negatives and fractions', () => {
    const seeds = PARITY_INPUTS.map((seed): [number] => [seed]);
    const streamOf = (make: (seed: number) => () => number) => (seed: number) => take(make(seed));
    expect(parityMismatches(seeds, streamOf(rng), streamOf(rngOracle))).toEqual([]);
  });

  it('matches the gobo seeds (i * 99 + 7)', () => {
    for (let i = 0; i < 16; i++) expect(take(rng(i * 99 + 7))).toEqual(take(rngOracle(i * 99 + 7)));
  });

  it('gives each call its own stream, so drawing from one does not move another', () => {
    const first = rng(42);
    first();
    first();
    expect(rng(42)()).toBe(rngOracle(42)());
  });

  it('stays in [0, 1)', () => {
    expect(take(rng(7)).every((x) => x >= 0 && x < 1)).toBe(true);
  });
});
