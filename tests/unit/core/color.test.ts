import { describe, expect, it } from 'vitest';
import { cssRgb, hsv, rgb2hsv } from '../../../src/core/index.ts';
import { PARITY_INPUTS, PARITY_INPUTS_SMALL, parityMismatches, triples } from './parityInputs.ts';

// Reference oracles: the original one-liners from index.html (48a3b63, lines 691-692 and the swatch template at 1974),
// formatted by Prettier, with types added only.
function hsvOracle(h: number, s: number, v: number) {
  const i = Math.floor(h * 6),
    f = h * 6 - i,
    p = v * (1 - s),
    q = v * (1 - f * s),
    t = v * (1 - (1 - f) * s);
  return [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ][((i % 6) + 6) % 6];
}
function rgb2hsvOracle(r: number, g: number, b: number) {
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, mx ? d / mx : 0, mx];
}
const cssOracle = (r: number, g: number, b: number) => `rgb(${r * 2.55},${g * 2.55},${b * 2.55})`;

// the original returns undefined once `h * 6` overflows; that case is covered by the RangeError test below
const isValidHue = (h: number) => Number.isFinite(h * 6);
const finite = PARITY_INPUTS_SMALL.filter(isValidHue);

describe('hsv', () => {
  it('matches the original for every valid hue, including wrapped and negative ones', () => {
    expect(parityMismatches(triples(finite), hsv, hsvOracle)).toEqual([]);
  });

  it('matches the original over a dense hue sweep at full saturation and value', () => {
    const hues = PARITY_INPUTS.filter(isValidHue).map((h): [number, number, number] => [h, 1, 1]);
    expect(parityMismatches(hues, hsv, hsvOracle)).toEqual([]);
  });

  it('throws a RangeError where the original returned undefined (h * 6 not finite)', () => {
    for (const h of [NaN, Infinity, -Infinity, Number.MAX_VALUE, -Number.MAX_VALUE]) {
      expect(hsvOracle(h, 1, 1)).toBeUndefined();
      expect(() => hsv(h, 1, 1)).toThrow(RangeError);
    }
  });
});

describe('rgb2hsv', () => {
  it('matches the original for every edge triple, including NaN channels', () => {
    expect(parityMismatches(triples(PARITY_INPUTS_SMALL), rgb2hsv, rgb2hsvOracle)).toEqual([]);
  });

  it('returns hue in 0..1, so hsv(rgb2hsv(c)) gives back c', () => {
    const [h, s, v] = rgb2hsv(0.2, 0.4, 0.8);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(1);
    const [r, g, b] = hsv(h, s, v);
    expect([r, g, b].map((x) => Math.round(x * 1e9) / 1e9)).toEqual([0.2, 0.4, 0.8]);
  });
});

describe('cssRgb', () => {
  it('does not round: 100 percent is 254.99999999999997, as the original strings were', () => {
    expect(100 * 2.55).toBe(254.99999999999997);
    expect(cssRgb(100, 100, 100)).toBe('rgb(254.99999999999997,254.99999999999997,254.99999999999997)');
  });

  it('matches the original template for every edge triple, including NaN and negatives', () => {
    expect(parityMismatches(triples(PARITY_INPUTS_SMALL), cssRgb, cssOracle)).toEqual([]);
  });
});
