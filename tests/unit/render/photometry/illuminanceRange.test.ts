import { describe, expect, it } from 'vitest';
import {
  apexOffset,
  candela,
  coneIrradiance,
  illuminance,
  lumens,
  peakCandela,
  resolveBeamProfile,
} from '../../../../src/render/photometry';
import { expectWithin } from './within';

// Expected values from an independent Python script: the peak by Simpson's rule (2,000,000 steps), then
// E = I / (d^2 + a^2) by hand. They are not outputs of the functions under test.
const GAUSSIAN_10 = resolveBeamProfile(10);
const PEAK = 290_252.48484;

describe('illuminance with a lens of finite size', () => {
  it('reads the data sheet value I / d^2 in the far field: a 10 degree Gaussian, 5 cm lens, 10 m', () => {
    expectWithin(peakCandela(lumens(10_000), GAUSSIAN_10), PEAK, 1e-6);
    const offset = apexOffset(0.05, GAUSSIAN_10.fieldHalf);
    expectWithin(offset, 0.3117048, 1e-6);
    const atTen = illuminance(candela(PEAK), 10, 1, offset);
    expectWithin(atTen, 2_899.7075, 1e-6);
    // within 0.1 % of I / d^2 = 2,902.5248 lx; the old range d + a gave 2,729.7 lx (-6 %)
    expectWithin(atTen, 2_902.5248, 1e-3);
  });

  it('uses d^2 + a^2: a = 0.57 m gives 2,893.125 lx at 10 m and I / a^2 = 893,359.4 lx at the lens', () => {
    expectWithin(illuminance(candela(PEAK), 10, 1, 0.57), 2_893.1251, 1e-6);
    expectWithin(illuminance(candela(PEAK), 0, 1, 0.57), 893_359.45, 1e-6);
    // a long apex (8 cm lens, 4 degree field, a = 2.29 m) keeps 95.0 % of I / d^2 at 10 m, not 66.2 %
    const narrow = apexOffset(0.08, (2 * Math.PI) / 180);
    expectWithin(illuminance(candela(100), 10, 1, narrow), 0.9501348, 1e-6);
  });

  it('falls off monotonically with the distance from the lens', () => {
    for (let d = 0; d < 30; d += 0.1) {
      expect(illuminance(candela(PEAK), d + 0.1, 1, 0.57)).toBeLessThan(illuminance(candela(PEAK), d, 1, 0.57));
    }
  });

  it('gives the same magnitude in the haze model on the axis', () => {
    const source = {
      lens: [0, 0, 0],
      axis: [0, 0, 1],
      profile: GAUSSIAN_10,
      peak: candela(PEAK),
      sourceRadius: 0.05,
    } as const;
    expectWithin(coneIrradiance(source, [0, 0, 10], 0).irradiance, 2_899.7075, 1e-6);
  });
});
