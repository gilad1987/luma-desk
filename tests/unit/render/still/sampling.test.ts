import { describe, expect, it } from 'vitest';
import { aperturePoint } from '../../../../src/render/still/aperture';
import { halton } from '../../../../src/render/still/halton';
import { FILTER_SIGMA_PX, gaussianJitter } from '../../../../src/render/still/jitter';

describe('halton', () => {
  it('gives the radical inverses in bases 2 and 3', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((i) => halton(i, 2))).toEqual([0.5, 0.25, 0.75, 0.125, 0.625, 0.375, 0.875]);
    const base3 = [1, 2, 3, 4, 5].map((i) => halton(i, 3));
    [1 / 3, 2 / 3, 1 / 9, 4 / 9, 7 / 9].forEach((value, i) => expect(base3[i]).toBeCloseTo(value, 12));
    expect(halton(0, 2)).toBe(0);
  });
});

describe('gaussianJitter', () => {
  const samples = Array.from({ length: 256 }, (_, i) => gaussianJitter(i));
  const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;

  it('has a zero mean and the variance of the cut Gaussian', () => {
    const xs = samples.map(([x]) => x);
    const ys = samples.map(([, y]) => y);
    expect(Math.abs(mean(xs))).toBeLessThan(0.01);
    expect(Math.abs(mean(ys))).toBeLessThan(0.01);
    // a 2D Gaussian cut at radius 3 sigma keeps 1 - 4.5 e^-4.5 / (1 - e^-4.5) = 0.9494 of its variance per axis
    const tail = Math.exp(-4.5);
    const variance = FILTER_SIGMA_PX ** 2 * (1 - (4.5 * tail) / (1 - tail));
    expect(mean(xs.map((x) => x * x))).toBeCloseTo(variance, 2);
    expect(mean(ys.map((y) => y * y))).toBeCloseTo(variance, 2);
    expect(mean(samples.map(([x, y]) => x * y))).toBeCloseTo(0, 2);
  });

  it('never leaves the 3 sigma disc and repeats for a sample index', () => {
    const radii = samples.map(([x, y]) => Math.hypot(x, y));
    expect(Math.max(...radii)).toBeLessThanOrEqual(3 * FILTER_SIGMA_PX);
    expect(gaussianJitter(17)).toEqual(gaussianJitter(17));
  });
});

describe('aperturePoint', () => {
  it('stays on the disc, averages to the centre and keeps the focus plane fixed', () => {
    const points = Array.from({ length: 256 }, (_, i) => aperturePoint(i, 0.05, 10));
    points.forEach((p) => {
      expect(Math.hypot(p.offsetX, p.offsetY)).toBeLessThanOrEqual(0.05 + 1e-12);
      // the ray from the moved eye with the sheared slope meets the focus plane where the pinhole ray does
      expect(p.offsetX + p.shearX * 10).toBeCloseTo(0, 12);
      expect(p.offsetY + p.shearY * 10).toBeCloseTo(0, 12);
    });
    const meanX = points.reduce((sum, p) => sum + p.offsetX, 0) / points.length;
    expect(Math.abs(meanX)).toBeLessThan(0.002);
  });

  it('is a pinhole at radius 0', () => {
    const p = aperturePoint(3, 0, 5);
    expect(Math.abs(p.offsetX) + Math.abs(p.offsetY) + Math.abs(p.shearX) + Math.abs(p.shearY)).toBe(0);
  });
});
