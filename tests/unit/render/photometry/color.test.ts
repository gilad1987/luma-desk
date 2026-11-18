import { describe, expect, it } from 'vitest';
import {
  D65,
  cctToXy,
  emitterToLinear,
  filterTransmission,
  linearSrgbToXyz,
  linearToSrgb,
  mixChromaticity,
  mixEmitters,
  peakNormalise,
  relativeLuminance,
  toSrgb8,
  xyYToLinearSrgb,
  xyYToXyz,
  xyzToLinearSrgb,
  xyzToXy,
} from '../../../../src/render/photometry';

const RED = { x: 0.64, y: 0.33 };
const GREEN = { x: 0.3, y: 0.6 };
const BLUE = { x: 0.15, y: 0.06 };

describe('sRGB conversion', () => {
  it('has the matrix the definition gives: each Rec. 709 primary is one pure channel and D65 is white', () => {
    const weights = [relativeLuminance([1, 0, 0]), relativeLuminance([0, 1, 0]), relativeLuminance([0, 0, 1])];
    const pure = [RED, GREEN, BLUE].map((xy, i) => xyYToLinearSrgb(xy, weights[i] ?? 0));
    expect(pure.flat().map((value) => Math.round(value * 1e9) / 1e9 + 0)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 10);
    expect(weights[0]).toBeCloseTo(0.2126, 4);
    expect(weights[1]).toBeCloseTo(0.7152, 4);
    expect(weights[2]).toBeCloseTo(0.0722, 4);
  });

  it('goes to XYZ and back', () => {
    const xyz = xyYToXyz({ x: 0.4, y: 0.35 }, 250);
    const back = linearSrgbToXyz(xyzToLinearSrgb(xyz));
    back.forEach((value, i) => expect(value).toBeCloseTo(xyz[i] ?? NaN, 7));
    expect(xyzToXy(xyz).x).toBeCloseTo(0.4, 12);
    expect(xyzToXy(xyz).y).toBeCloseTo(0.35, 12);
    expect(xyzToXy([0, 0, 0])).toBe(D65);
    expect(relativeLuminance(xyYToLinearSrgb({ x: 0.4, y: 0.35 }, 250))).toBeCloseTo(250, 7);
  });

  it('encodes with the sRGB curve: linear below 0.0031308, 18 % grey is 118, and it clips', () => {
    expect(linearToSrgb(0.002)).toBeCloseTo(0.02584, 12);
    expect(linearToSrgb(0.0031308)).toBeCloseTo(1.055 * 0.0031308 ** (1 / 2.4) - 0.055, 6);
    expect(toSrgb8([0.18, 0.18, 0.18])).toEqual([118, 118, 118]);
    expect(toSrgb8([-1, 0.5, 7])).toEqual([0, 188, 255]);
    expect(peakNormalise([4, 2, 1])).toEqual([1, 0.5, 0.25]);
    expect(peakNormalise([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe('additive mixing of emitters', () => {
  it('adds by luminous flux in linear light: the three primaries in the white ratio give D65', () => {
    const emitters = [
      { xy: RED, amount: 212.639005872 },
      { xy: GREEN, amount: 715.168678768 },
      { xy: BLUE, amount: 72.192315361 },
    ];
    mixEmitters(emitters).forEach((channel) => expect(channel).toBeCloseTo(1000, 5));
    const mix = mixChromaticity(emitters);
    expect(mix.amount).toBeCloseTo(1000, 6);
    expect(mix.xy.x).toBeCloseTo(D65.x, 9);
    expect(mix.xy.y).toBeCloseTo(D65.y, 9);
  });

  it('keeps the lumens of every emitter, also of one outside the gamut', () => {
    const emitters = [
      { xy: cctToXy(3200), amount: 4000 },
      { xy: { x: 0.17, y: 0.7 }, amount: 1500 },
      { xy: { x: 0.69, y: 0.31 }, amount: 500 },
    ];
    const rgb = mixEmitters(emitters);
    expect(relativeLuminance(rgb)).toBeCloseTo(6000, 6);
    expect(Math.min(...rgb)).toBeGreaterThanOrEqual(0);
    expect(mixChromaticity(emitters).amount).toBe(6000);
    expect(mixEmitters([])).toEqual([0, 0, 0]);
    expect(emitterToLinear(D65, 0)).toEqual([0, 0, 0]);
  });

  it('gives the luminous transmittance of a colour filter', () => {
    expect(filterTransmission([1, 1, 1], [1, 1, 1])).toBeCloseTo(1, 12);
    expect(filterTransmission([5, 5, 5], [1, 0, 0])).toBeCloseTo(0.2126, 4);
    expect(filterTransmission([5, 5, 5], [0, 1, 1])).toBeCloseTo(1 - 0.2126, 4);
    expect(filterTransmission([0, 0, 0], [1, 1, 1])).toBe(0);
  });
});
