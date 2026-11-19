import { describe, expect, it } from 'vitest';
import {
  hazeExtinction,
  hazeScatter,
  innerFraction,
  peakIntensity,
  reachOf,
  stepsFor,
} from '../../../../src/render/beams/beamIntensity';

const tanOfDegrees = (degrees: number): number => Math.tan((degrees * Math.PI) / 180);

describe('beam intensity model', () => {
  it('gives a narrow beam the peak intensity of its small solid angle', () => {
    const narrow = peakIntensity(tanOfDegrees(1.5));
    const wide = peakIntensity(tanOfDegrees(20));
    // the ratio of the two cone solid angles, 2 pi (1 - cos)
    const expected = (1 - Math.cos((20 * Math.PI) / 180)) / (1 - Math.cos((1.5 * Math.PI) / 180));
    expect(narrow / wide).toBeCloseTo(expected, 3);
    expect(narrow).toBeGreaterThan(100 * wide);
  });

  it('keeps the peak intensity finite for a beam with no width', () => {
    expect(peakIntensity(0)).toBe(peakIntensity(tanOfDegrees(0.5)));
    expect(Number.isFinite(peakIntensity(0))).toBe(true);
  });

  it('leaves only a trace of the beams at haze 0 and grows with the control', () => {
    expect(hazeScatter(0)).toBeLessThan(0.02 * hazeScatter(1));
    expect(hazeScatter(0)).toBeGreaterThan(0);
    expect(hazeScatter(0.3)).toBeLessThan(hazeScatter(0.6));
    expect(hazeScatter(2)).toBe(hazeScatter(1));
    expect(hazeExtinction(0)).toBeLessThan(0.0001);
  });

  it('draws a narrow beam to its end and cuts a blinder early', () => {
    expect(reachOf(tanOfDegrees(2))).toBeGreaterThan(85);
    expect(reachOf(tanOfDegrees(60))).toBeLessThan(20);
  });

  it('gives a soft wash a smaller core than a hard spot', () => {
    expect(innerFraction(3)).toBeLessThan(innerFraction(1.3));
    expect(innerFraction(10)).toBe(0.2);
  });

  it('marches fewer steps when many beams are lit', () => {
    expect(stepsFor(250)).toBeLessThan(stepsFor(40));
    expect(stepsFor(1000)).toBeGreaterThanOrEqual(8);
  });
});
