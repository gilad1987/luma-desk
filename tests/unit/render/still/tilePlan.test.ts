import { describe, expect, it } from 'vitest';
import { planTiles, viewOffset, type TilePlan } from '../../../../src/render/still/tilePlan';

/** Counts how often each output pixel is covered; every count must be exactly 1. */
function coverage(plan: TilePlan): Uint8Array {
  const counts = new Uint8Array(plan.width * plan.height);
  for (const tile of plan.tiles) {
    for (let y = tile.y; y < tile.y + tile.height; y++) {
      for (let x = tile.x; x < tile.x + tile.width; x++)
        counts[y * plan.width + x] = (counts[y * plan.width + x] ?? 0) + 1;
    }
  }
  return counts;
}

describe('planTiles', () => {
  it.each([
    [3840, 2160, 4],
    [7680, 4320, 16],
    [4097, 2161, 9],
    [640, 360, 1],
    [1, 1, 1],
  ])('covers %i x %i exactly once with %i tiles of at most 1920 x 1080', (width, height, count) => {
    const plan = planTiles(width, height);
    expect(plan.tiles).toHaveLength(count);
    expect(coverage(plan).every((c) => c === 1)).toBe(true);
    const area = plan.tiles.reduce((sum, t) => sum + t.width * t.height, 0);
    expect(area).toBe(width * height);
    plan.tiles.forEach((t, i) => {
      expect(t.index).toBe(i);
      expect(t.width).toBeLessThanOrEqual(1920);
      expect(t.height).toBeLessThanOrEqual(1080);
      expect(t.glY).toBe(height - t.y - t.height);
    });
  });

  it('orders the tiles in rows from the top, each left to right', () => {
    const plan = planTiles(4097, 2161);
    const keys = plan.tiles.map((t) => t.y * 100000 + t.x);
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
    expect(plan.tiles.map((t) => t.width)).toEqual([1365, 1366, 1366, 1365, 1366, 1366, 1365, 1366, 1366]);
  });

  it('accepts 16384 on a side and refuses more, zero and fractions', () => {
    expect(planTiles(16384, 16384).tiles).toHaveLength(9 * 16);
    expect(() => planTiles(16385, 10)).toThrow(RangeError);
    expect(() => planTiles(0, 10)).toThrow(RangeError);
    expect(() => planTiles(10, 10.5)).toThrow(RangeError);
  });
});

describe('viewOffset', () => {
  it('moves the window by the jitter and keeps the tile size', () => {
    const plan = planTiles(3840, 2160);
    const tile = plan.tiles[3];
    expect(tile).toBeDefined();
    if (!tile) return;
    expect(viewOffset(plan, tile, [0.25, -0.5])).toEqual({
      fullWidth: 3840,
      fullHeight: 2160,
      x: 1920.25,
      y: 1079.5,
      width: 1920,
      height: 1080,
    });
  });
});
