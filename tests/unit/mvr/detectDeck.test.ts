import { describe, expect, it } from 'vitest';
import type { SurfaceBox, Vec3 } from '../../../src/domain/stage/types.ts';
import { detectDeck } from '../../../src/mvr/design/detectDeck.ts';

/** A surface from its x/z rectangle `[x0, z0, x1, z1]` and its top height. */
const top = ([x0, z0, x1, z1]: readonly number[], y: number): SurfaceBox => ({
  min: [x0 ?? 0, y - 1, z0 ?? 0],
  max: [x1 ?? 0, y, z1 ?? 0],
  face: 'top',
});

const DECK = top([-5, -5, 5, 5], 1.5);
const CASE = top([0, 0, 1, 1], 3);
const ROOF = top([-20, -20, 20, 20], 30);
const RIG: Vec3[] = [
  [0, 8, 0],
  [2, 8, -2],
  [0.5, 4, 0.5],
  [30, 8, 30],
];

describe('detectDeck', () => {
  it('takes the highest top of 4 m² or more that lies under a quarter of the fixtures', () => {
    expect(detectDeck([CASE, ROOF, DECK], RIG)).toEqual({ x0: -5, x1: 5, z0: -5, z1: 5, height: 1.5 });
  });

  it('skips tops smaller than 4 m², even when fixtures are above them', () => {
    expect(detectDeck([CASE], RIG)).toBeUndefined();
  });

  it('gives undefined when under a quarter of the fixtures are above every top', () => {
    const far: Vec3[] = [
      [50, 8, 50],
      [51, 8, 50],
      [52, 8, 50],
      [53, 8, 50],
      [0, 8, 0],
    ];
    expect(detectDeck([DECK], far)).toBeUndefined();
  });

  it('gives undefined without fixtures', () => {
    expect(detectDeck([DECK], [])).toBeUndefined();
  });
});
