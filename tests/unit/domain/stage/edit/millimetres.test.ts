/**
 * Owns the 1 mm rounding the move ops store: a value near zero reads as +0, not -0, and a fixture's pixel line is
 * rounded with its body. Which ops round is owned by placement.test.ts and fixtureMoves.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { roundFixtureToMillimetre, roundToMillimetre } from '../../../../../src/domain/stage/edit/millimetres.ts';
import { sampleDesign } from './sampleDesign.ts';

describe('roundToMillimetre', () => {
  it('turns a rounded -0 into +0, so a position near zero compares and prints as 0', () => {
    const rounded = roundToMillimetre([-0.0004, -0, 1.0006]);
    expect([Object.is(rounded[0], 0), Object.is(rounded[1], 0), rounded[2]]).toEqual([true, true, 1.001]);
  });
});

describe('roundFixtureToMillimetre', () => {
  it('rounds the body and the pixel line, and keeps every other field', () => {
    const [wash] = sampleDesign().fixtures;
    if (!wash) throw new Error('the sample design has fixtures');
    const strip = {
      ...wash,
      position: [1.2344, 7, 0] as const,
      pixel: { p: [0.0006, 7, 0] as const, tan: [1, 0, 0] as const, len: 2 },
    };
    expect(roundFixtureToMillimetre(strip)).toEqual({
      ...strip,
      position: [1.234, 7, 0],
      pixel: { p: [0.001, 7, 0], tan: [1, 0, 0], len: 2 },
    });
  });
});
