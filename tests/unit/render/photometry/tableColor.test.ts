import { describe, expect, it } from 'vitest';
import {
  D65,
  cctToXy,
  emitterToLinear,
  hueAngle,
  isInSrgbGamut,
  mapToSrgbGamut,
  peakNormalise,
  relativeLuminance,
  toSrgb8,
  xyYToLinearSrgb,
} from '../../../../src/render/photometry';
import { expectWithin } from './within';

describe('photometry validation table: colour', () => {
  it('D65 at Y = 1 is linear (1, 1, 1) and sRGB 255, 255, 255', () => {
    const rgb = xyYToLinearSrgb({ x: 0.3127, y: 0.329 }, 1);
    for (const channel of rgb) expect(Math.abs(channel - 1)).toBeLessThan(1e-3);
    // the matrix is derived from this white, so it is exact to rounding and not only to 1e-3
    for (const channel of rgb) expect(channel).toBeCloseTo(1, 9);
    expect(toSrgb8(rgb)).toEqual([255, 255, 255]);
  });

  it('3200 K is xy (0.4234, 0.3990), linear (1.680, 0.866, 0.326), swatch 255, 190, 122', () => {
    const xy = cctToXy(3200);
    expect(Math.abs(xy.x - 0.4234)).toBeLessThan(5e-4);
    expect(Math.abs(xy.y - 0.399)).toBeLessThan(5e-4);
    const rgb = xyYToLinearSrgb(xy, 1);
    expectWithin(rgb[0], 1.68);
    expectWithin(rgb[1], 0.866);
    expectWithin(rgb[2], 0.326);
    expect(toSrgb8(peakNormalise(rgb))).toEqual([255, 190, 122]);
    // the xy of the table itself, without the locus approximation
    expect(toSrgb8(peakNormalise(xyYToLinearSrgb({ x: 0.4234, y: 0.399 }, 1)))).toEqual([255, 190, 122]);
  });

  it('5600 K is xy (0.3301, 0.3391) and swatch 255, 239, 228', () => {
    // CORRECTED expectation. The task table gave xy (0.3302, 0.3411) and 255, 240, 228. That y is the Planckian
    // value for 5500 K (0.3325, 0.3411). Kim, Krystek and a direct integral of Planck's law all give y = 0.3388 to
    // 0.3393 at 5600 K, and green 238 or 239.
    const xy = cctToXy(5600);
    expect(Math.abs(xy.x - 0.3301)).toBeLessThan(5e-4);
    expect(Math.abs(xy.y - 0.3391)).toBeLessThan(5e-4);
    expect(toSrgb8(peakNormalise(xyYToLinearSrgb(xy, 1)))).toEqual([255, 239, 228]);
    // the conversion itself agrees with the table: its xy does give 255, 240, 228
    expect(toSrgb8(peakNormalise(xyYToLinearSrgb({ x: 0.3302, y: 0.3411 }, 1)))).toEqual([255, 240, 228]);
    expect(cctToXy(5500).y).toBeCloseTo(0.3411, 3);
  });

  it('LED green xy (0.17, 0.70) is out of gamut: red is -0.84 at Y = 1', () => {
    const green = { x: 0.17, y: 0.7 };
    expectWithin(xyYToLinearSrgb(green, 1)[0], -0.8429);
    expect(isInSrgbGamut(green)).toBe(false);
  });

  it('maps the LED green to a saturated green with no negative channel and the same luminance', () => {
    const green = { x: 0.17, y: 0.7 };
    const mapped = mapToSrgbGamut(green);
    expect(isInSrgbGamut(mapped)).toBe(true);
    // the nearest point of the triangle in u'v' is its green corner (by hand: an independent Python script)
    expect(mapped.x).toBeCloseTo(0.3, 9);
    expect(mapped.y).toBeCloseTo(0.6, 9);
    const rgb = emitterToLinear(green, 1);
    expect(rgb[0]).toBeLessThan(1e-9);
    expect(rgb[2]).toBeLessThan(1e-9);
    // 1 / 0.715168678768: all of Y = 1 in the green channel
    expect(rgb[1]).toBeCloseTo(1.398272, 6);
    expect(relativeLuminance(rgb)).toBeCloseTo(1, 9);
    // the move toward D65 kept the dominant wavelength but gave a mint (0.26, 0.46); this one does not keep it
    expect(Math.abs(hueAngle(mapped) - hueAngle(green))).toBeGreaterThan(0.1);
  });

  it('leaves an in-gamut colour and white as they are', () => {
    const warm = cctToXy(3200);
    expect(mapToSrgbGamut(warm)).toBe(warm);
    expect(mapToSrgbGamut(D65)).toBe(D65);
    expect(mapToSrgbGamut({ x: 0.3, y: 0 })).toBe(D65);
  });
});
