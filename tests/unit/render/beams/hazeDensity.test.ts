import { describe, expect, it } from 'vitest';
import { hazeDensity, hazeExtinction, hazeScatter } from '../../../../src/render/beams/beamIntensity';
import { createHazeNoise } from '../../../../src/render/beams/hazeNoise';

describe('haze medium', () => {
  it('gives the hall one density per metre: thin at 30, the default at 62, thick at 100', () => {
    expect(hazeDensity(0.3)).toBeCloseTo(0.002, 3);
    expect(hazeDensity(0.62)).toBeCloseTo(0.01, 3);
    expect(hazeDensity(1)).toBeCloseTo(0.03, 6);
    expect(hazeDensity(0)).toBeLessThan(0.0005);
  });

  it('scatters and loses in proportion to the density', () => {
    for (const haze of [0, 0.3, 0.62, 1]) {
      expect(hazeScatter(haze) / hazeDensity(haze)).toBeCloseTo(hazeScatter(1) / hazeDensity(1), 9);
      expect(hazeExtinction(haze) / hazeDensity(haze)).toBeCloseTo(hazeExtinction(1) / hazeDensity(1), 9);
    }
    expect(hazeScatter(1) / hazeScatter(0.62)).toBeGreaterThan(2.5);
    expect(hazeScatter(0.62) / hazeScatter(0.3)).toBeGreaterThan(4);
  });

  it('builds the same smooth noise in every run: no texel differs from its neighbour by a large step', () => {
    const data = Array.from(createHazeNoise().image.data);
    expect(data).toEqual(Array.from(createHazeNoise().image.data));
    let steepest = 0;
    for (let i = 0; i < 32 * 32 * 32; i++) {
      const next = i % 32 === 31 ? i - 31 : i + 1;
      steepest = Math.max(steepest, Math.abs((data[i] ?? 0) - (data[next] ?? 0)));
    }
    // a random value per texel steps by up to 255; smooth noise at two sizes stays far below
    expect(steepest).toBeLessThan(70);
    expect(Math.max(...data) - Math.min(...data)).toBeGreaterThan(120);
  });
});
