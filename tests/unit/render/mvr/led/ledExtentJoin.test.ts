/** The tiles of one wall join into one extent; walls that only meet at a corner stay two. */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { joinExtents } from '../../../../../src/render/mvr/led/ledExtentJoin.ts';
import type { WallExtent } from '../../../../../src/render/mvr/led/ledMeshExtents.ts';

/** The extent from (x0, y0) to (x1, y1) on the wall axes, 0.1 m deep. */
const extent = (x0: number, y0: number, x1: number, y1: number): WallExtent => ({
  low: new Vector3(x0, y0, 0),
  high: new Vector3(x1, y1, 0.1),
});

/** The joined extents, as [low x, low y, high x, high y] rounded to centimetres, from left to right. */
const joined = (extents: WallExtent[]): number[][] =>
  joinExtents(extents)
    .map(({ low, high }) => [low.x, low.y, high.x, high.y].map((v) => Math.round(v * 100) / 100))
    .sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));

describe('joinExtents', () => {
  // two 3 x 3 m walls on a diagonal step are not one 6 x 6 m wall (review R2-31)
  it('keeps two walls that meet only at one corner apart', () => {
    expect(joined([extent(0, 0, 3, 3), extent(3.05, 3.05, 6, 6)])).toEqual([
      [0, 0, 3, 3],
      [3.05, 3.05, 6, 6],
    ]);
  });

  it('joins a 6 x 3 m wall of 72 cabinets of 0.5 m with 2 cm seams into one', () => {
    const tiles = Array.from({ length: 72 }, (_, i) => {
      const [x, y] = [-3 + (i % 12) * 0.5, Math.floor(i / 12) * 0.5];
      return extent(x + 0.01, y + 0.01, x + 0.49, y + 0.49);
    });
    expect(joined(tiles)).toEqual([[-2.99, 0.01, 2.99, 2.99]]);
  });

  it('joins a row of tiles given in any order, and keeps a tile 1 m away apart', () => {
    const row = [extent(0, 0, 1, 1), extent(5, 0, 6, 1), extent(1.05, 0, 2, 1), extent(2.05, 0, 3, 1)];
    expect(joined(row)).toEqual([
      [0, 0, 3, 1],
      [5, 0, 6, 1],
    ]);
  });
});
