/**
 * CIE xyY to linear sRGB against reference colours: the D65 white and the three sRGB primaries, whose xyY values
 * IEC 61966-2-1 defines. An out-of-gamut colour moves to the nearest sRGB edge in u'v', so it stays saturated.
 */
import { describe, expect, it } from 'vitest';
import { parseColorCie, xyyToLinearSrgb } from '../../../src/mvr/gdtf/optics/cieColor.ts';
import { parseDmxValue } from '../../../src/mvr/gdtf/optics/dmxValue.ts';

const REFERENCES = [
  ['D65 white', [0.3127, 0.329, 100], [1, 1, 1]],
  ['sRGB red', [0.64, 0.33, 21.26], [1, 0, 0]],
  ['sRGB green', [0.3, 0.6, 71.52], [0, 1, 0]],
  ['sRGB blue', [0.15, 0.06, 7.22], [0, 0, 1]],
  ['half grey', [0.3127, 0.329, 50], [0.5, 0.5, 0.5]],
] as const;

describe('xyyToLinearSrgb', () => {
  it.each(REFERENCES)('maps %s to its linear sRGB value', (_name, xyy, rgb) => {
    xyyToLinearSrgb(xyy).forEach((part, index) => expect(part).toBeCloseTo(rgb[index] ?? -1, 2));
  });

  it('maps the GDTF white to 1, 1, 1 with the exact IEC 61966-2-1 matrix', () => {
    // the matrix gives 0.99983, 1.00005, 1.00006 for this xy, which is rounded to 4 digits; 1e-4 is not reachable
    xyyToLinearSrgb([0.3127, 0.329, 100]).forEach((part) => expect(Math.abs(part - 1)).toBeLessThan(3e-4));
  });

  it.each([
    ['an LED green', [0.17, 0.7, 50], 1],
    ['a deep red', [0.7, 0.3, 20], 0],
    ['a deep blue', [0.15, 0.03, 5], 2],
  ] as const)('moves %s to the nearest sRGB edge and keeps it saturated', (_name, xyy, main) => {
    const rgb = xyyToLinearSrgb(xyy);
    const top = rgb[main];
    expect(top).toBeGreaterThan(0);
    rgb.forEach((part, index) => expect(index === main ? part : part / top).toBeLessThan(index === main ? 1.01 : 0.02));
  });

  it('leaves a colour inside the gamut where it is', () => {
    const [r, g, b] = xyyToLinearSrgb([0.4, 0.4, 30]);
    const bigX = 0.4124 * r + 0.3576 * g + 0.1805 * b;
    const bigY = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const sum = bigX + bigY + (0.0193 * r + 0.1192 * g + 0.9505 * b);
    expect([bigX / sum, bigY / sum, bigY]).toEqual([
      expect.closeTo(0.4, 4),
      expect.closeTo(0.4, 4),
      expect.closeTo(0.3, 4),
    ]);
  });

  it('gives black for zero luminance', () => {
    expect(xyyToLinearSrgb([0.3127, 0.329, 0])).toEqual([0, 0, 0]);
  });
});

describe('parseColorCie', () => {
  it('reads the GDTF text form, with or without braces', () => {
    expect(parseColorCie('0.312700,0.329000,100.000000')).toEqual([0.3127, 0.329, 100]);
    expect(parseColorCie('{0.64, 0.33, 21.26}')).toEqual([0.64, 0.33, 21.26]);
  });

  it.each(['255.000000,31.000000,0.000000', '0.6,0.5,50', '0.3,0,50', '0.3,0.3,120', '0.3,0.3', 'red', undefined])(
    'rejects %s, which is not a CIE chromaticity',
    (text) => expect(parseColorCie(text)).toBeUndefined(),
  );
});

describe('parseDmxValue', () => {
  it('mirrors bytes into a wider channel and keeps the high bytes in a narrower one', () => {
    expect(parseDmxValue('255/1', 2)).toBe(65535);
    expect(parseDmxValue('128/1', 2)).toBe(0x8080);
    expect(parseDmxValue('32768/2', 1)).toBe(128);
    expect(parseDmxValue('32768/2', 2)).toBe(32768);
  });

  it('shifts bytes when the value asks for it, and rejects what is not a DMX value', () => {
    expect(parseDmxValue('1/1s', 2)).toBe(256);
    expect(parseDmxValue('None', 1)).toBeUndefined();
    expect(parseDmxValue('300/1', 1)).toBeUndefined();
  });
});
