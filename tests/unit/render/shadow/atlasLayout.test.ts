import { describe, expect, it } from 'vitest';
import { LIVE_LAYOUT, RECT, STILL_LAYOUT, tileCount, tileRects } from '../../../../src/render/shadow/atlasLayout';

const rectsOf = (rects: Uint16Array): [number, number, number][] =>
  Array.from({ length: rects.length / RECT }, (_, i) => [
    rects[i * RECT] ?? 0,
    rects[i * RECT + 1] ?? 0,
    rects[i * RECT + 2] ?? 0,
  ]);

describe('tileRects', () => {
  it('puts 8 hero tiles of 1024 in the first half and 32 tiles of 512 in the second', () => {
    const rects = rectsOf(tileRects(LIVE_LAYOUT));
    expect(tileCount(LIVE_LAYOUT)).toBe(40);
    expect(rects.slice(0, 8).every(([, y, side]) => side === 1024 && y < 2048)).toBe(true);
    expect(rects.slice(8).every(([, y, side]) => side === 512 && y >= 2048)).toBe(true);
    expect(rects[0]).toEqual([0, 0, 1024]);
    expect(rects[7]).toEqual([3072, 1024, 1024]);
    expect(rects[8]).toEqual([0, 2048, 512]);
    expect(rects[39]).toEqual([3584, 3584, 512]);
  });

  it.each([LIVE_LAYOUT, STILL_LAYOUT])('keeps every tile inside the atlas and apart from the others', (layout) => {
    const rects = rectsOf(tileRects(layout));
    for (const [x, y, side] of rects) expect(Math.max(x + side, y + side)).toBeLessThanOrEqual(layout.size);
    rects.forEach(([ax, ay, aside], a) =>
      rects.slice(a + 1).forEach(([bx, by, bside]) => {
        expect(ax + aside <= bx || bx + bside <= ax || ay + aside <= by || by + bside <= ay).toBe(true);
      }),
    );
  });

  it('gives the still layout 64 tiles of 1024', () => {
    const rects = rectsOf(tileRects(STILL_LAYOUT));
    expect(rects).toHaveLength(64);
    expect(rects[63]).toEqual([7168, 7168, 1024]);
  });

  it('refuses a layout whose tiles do not fit', () => {
    expect(() => tileRects({ ...LIVE_LAYOUT, secondary: { count: 33, size: 512 } })).toThrow(RangeError);
    expect(() => tileRects({ size: 512, hero: { count: 1, size: 1024 }, secondary: { count: 0, size: 512 } })).toThrow(
      RangeError,
    );
  });
});
