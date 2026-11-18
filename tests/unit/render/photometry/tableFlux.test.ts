import { describe, expect, it } from 'vitest';
import { D2R } from '../../../../src/core';
import {
  beamDiameter,
  coneSolidAngle,
  discIlluminance,
  illuminance,
  lambertLuminance,
  lumens,
  lux,
  peakCandela,
  profileAt,
  resolveBeamProfile,
  uniformConeIntensity,
} from '../../../../src/render/photometry';
import { expectWithin } from './within';

const FLUX = lumens(10_000);

describe('photometry validation table: flux, intensity and illuminance', () => {
  it('10,000 lm in a uniform 10 degree cone: 0.023909 sr, 418,245 cd, 4,182 lx at 10 m', () => {
    expectWithin(coneSolidAngle(10), 0.023909);
    const intensity = uniformConeIntensity(FLUX, 10);
    expectWithin(intensity, 418_245);
    expectWithin(illuminance(intensity, 10), 4_182);
    // the exact values, from 2 pi (1 - cos 5 deg)
    expect(coneSolidAngle(10)).toBeCloseTo(2 * Math.PI * (1 - Math.cos(5 * D2R)), 12);
    expectWithin(intensity, 418_245.2455, 1e-9);
  });

  it('spreads 10,000 lm over the hemisphere at 180 degrees and the full sphere at 360, as the solid angle does', () => {
    // flux / 2 pi, flux / (4 pi sin^2 67.5 deg) and flux / 4 pi, by hand
    expectWithin(uniformConeIntensity(FLUX, 180), 1_591.5494, 1e-7);
    expectWithin(uniformConeIntensity(FLUX, 270), 932.30807, 1e-7);
    expectWithin(uniformConeIntensity(FLUX, 360), 795.77472, 1e-7);
    expect(uniformConeIntensity(FLUX, 400)).toBe(uniformConeIntensity(FLUX, 360));
  });

  it('a 10 degree beam from a point is 1.750 m wide at 10 m', () => {
    expectWithin(beamDiameter(10, 10, 0), 1.75);
    expect(beamDiameter(10, 10, 0)).toBeCloseTo(1.7497733, 6);
    // a real lens adds its own diameter
    expect(beamDiameter(10, 10, 0.05)).toBeCloseTo(1.8497733, 6);
    // 180 degrees is capped at a half angle of 89.9: 20 tan(89.9 deg) = 11,459.144 m (by hand), not 3.3e17 m
    expectWithin(beamDiameter(10, 180), 11_459.144, 1e-7);
    expect(beamDiameter(10, 400)).toBe(beamDiameter(10, 180));
  });

  it('the same flux averaged over the flat disc at 10 m is 4,159 lx, below the on-axis value', () => {
    const mean = discIlluminance(FLUX, beamDiameter(10, 10, 0));
    expectWithin(mean, 4_159);
    expect(mean).toBeLessThan(illuminance(uniformConeIntensity(FLUX, 10), 10));
  });

  it('10,000 lm, Gaussian profile, 10 degree beam angle: 290,252 cd, 2,903 lx at 10 m, 18.2 degree field', () => {
    const profile = resolveBeamProfile(10, undefined);
    expect(profile.exponent).toBeCloseTo(2, 12);
    const peak = peakCandela(FLUX, profile);
    expectWithin(peak, 290_252);
    expectWithin(peak, 290_252.4848, 1e-7);
    expectWithin(illuminance(peak, 10), 2_903);
    expectWithin((2 * profile.fieldHalf) / D2R, 18.2);
    expect((2 * profile.fieldHalf) / D2R).toBeCloseTo(18.226157, 5);
    // the two points that define the angles
    expect(profileAt(profile, profile.beamHalf)).toBeCloseTo(0.5, 12);
    expect(profileAt(profile, profile.fieldHalf)).toBeCloseTo(0.1, 12);
  });

  it('a soft edge lowers the peak: the Gaussian is below the uniform cone of the same field angle', () => {
    const gaussian = peakCandela(FLUX, resolveBeamProfile(10, 18.226157));
    expect(gaussian).toBeLessThan(uniformConeIntensity(FLUX, 10));
    expect(gaussian).toBeGreaterThan(uniformConeIntensity(FLUX, 18.226157));
  });

  it('4,182 lx on reflectance 0.18 is 239.6 nits, on 0.8 it is 1,065 nits', () => {
    expectWithin(lambertLuminance(lux(4_182), 0.18), 239.6);
    expectWithin(lambertLuminance(lux(4_182), 0.8), 1_065);
    expect(lambertLuminance(lux(4_182), 0.18)).toBeCloseTo((0.18 * 4_182) / Math.PI, 9);
  });
});
