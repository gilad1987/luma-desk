import { describe, expect, it } from 'vitest';
import { D65, isInSrgbGamut, mapToSrgbGamut, xyYToLinearSrgb } from '../../../../src/render/photometry';

/** Linear sRGB at Y = 1 of the mapped colour. */
function mappedRgb(x: number, y: number): readonly number[] {
  return xyYToLinearSrgb(mapToSrgbGamut({ x, y }), 1);
}

// Expected values from an independent Python script: u'v' by the CIE 15 formulas, the nearest point of each edge
// clamped to the segment, then back to xy. They are not outputs of the function under test.
describe("gamut mapping to the nearest edge point in u'v'", () => {
  it('keeps a saturated LED green and red saturated', () => {
    const green = mappedRgb(0.17, 0.7);
    expect(green[0]).toBeLessThan(0.02 * (green[1] ?? 0));
    expect(green[2]).toBeLessThan(0.02 * (green[1] ?? 0));
    const red = mappedRgb(0.7, 0.3);
    expect(red[1]).toBeLessThan(0.02 * (red[0] ?? 0));
    expect(red[2]).toBeLessThan(0.02 * (red[0] ?? 0));
    expect(red[0]).toBeCloseTo(4.702806, 6);
  });

  it('takes a deep blue beyond the triangle to the blue primary', () => {
    const blue = mapToSrgbGamut({ x: 0.15, y: 0.03 });
    expect(blue.x).toBeCloseTo(0.15, 9);
    expect(blue.y).toBeCloseTo(0.06, 9);
  });

  it('leaves an in-gamut colour unchanged and D65 white', () => {
    const inside = mapToSrgbGamut({ x: 0.4, y: 0.4 });
    expect(Math.abs(inside.x - 0.4)).toBeLessThan(1e-9);
    expect(Math.abs(inside.y - 0.4)).toBeLessThan(1e-9);
    for (const channel of xyYToLinearSrgb(mapToSrgbGamut(D65), 1)) expect(channel).toBeCloseTo(1, 9);
  });

  it('is continuous: a colour 1e-6 outside the green-blue edge moves by less than 1e-3', () => {
    const justOutside = { x: 0.1893997759748948, y: 0.20184336104267428 };
    expect(isInSrgbGamut(justOutside)).toBe(false);
    const mapped = mapToSrgbGamut(justOutside);
    expect(isInSrgbGamut(mapped)).toBe(true);
    expect(Math.hypot(mapped.x - justOutside.x, mapped.y - justOutside.y)).toBeLessThan(1e-3);
    expect(mapped.x).toBeCloseTo(0.1894009, 6);
    expect(mapped.y).toBeCloseTo(0.2018433, 6);
  });
});
