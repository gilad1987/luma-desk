import { describe, expect, it } from 'vitest';
import {
  linearSrgbToXyz,
  mixChromaticity,
  mixEmitters,
  peakNormalise,
  relativeLuminance,
  toSrgb8,
  xyzToXy,
} from '../../../../src/render/photometry';

describe('mix of emitters outside the gamut', () => {
  it('mixes in XYZ before the gamut mapping: LED red and green give a saturated yellow, not a pale peach', () => {
    // Expected values from an independent Python script (XYZ sum by hand, then the sRGB matrix and curve).
    const emitters = [
      { xy: { x: 0.7, y: 0.3 }, amount: 1 },
      { xy: { x: 0.17, y: 0.7 }, amount: 2.5 },
    ];
    const truth = mixChromaticity(emitters);
    expect(truth.xy.x).toBeCloseTo(0.425862, 6);
    expect(truth.xy.y).toBeCloseTo(0.506897, 6);
    const rgb = mixEmitters(emitters);
    expect(relativeLuminance(rgb)).toBeCloseTo(3.5, 9);
    expect(rgb[2]).toBeLessThan(1e-9);
    expect(toSrgb8(peakNormalise(rgb))).toEqual([255, 250, 0]);
    // one map of the sum stays near the true mix; the old map per emitter gave xy (0.3883, 0.4039)
    const shown = xyzToXy(linearSrgbToXyz(rgb));
    expect(Math.abs(shown.x - 0.42294)).toBeLessThan(1e-4);
    expect(Math.abs(shown.y - 0.50236)).toBeLessThan(1e-4);
  });
});
