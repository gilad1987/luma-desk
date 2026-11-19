import { describe, expect, it } from 'vitest';
import { D2R } from '../../../../src/core';
import {
  GAUSSIAN_FIELD_RATIO,
  MIN_FIELD_RATIO,
  lumens,
  peakCandela,
  profileAt,
  profileExponent,
  resolveBeamProfile,
} from '../../../../src/render/photometry';

const degrees = (radians: number): number => radians / D2R;

describe('beam profile from GDTF angles', () => {
  it('passes 50 % at the beam angle and 10 % at the field angle', () => {
    for (const [beam, field] of [
      [10, 12],
      [10, 18.2],
      [10, 30],
      [5, 40],
    ] as const) {
      const profile = resolveBeamProfile(beam, field);
      expect(degrees(profile.beamHalf)).toBeCloseTo(beam / 2, 12);
      expect(degrees(profile.fieldHalf)).toBeCloseTo(field / 2, 12);
      expect(profileAt(profile, profile.beamHalf)).toBeCloseTo(0.5, 12);
      expect(profileAt(profile, profile.fieldHalf)).toBeCloseTo(0.1, 12);
    }
  });

  it('has the exponent ln(ln10 / ln2) / ln(field / beam)', () => {
    expect(profileExponent(1, GAUSSIAN_FIELD_RATIO)).toBeCloseTo(2, 12);
    expect(profileExponent(1, 3)).toBeCloseTo(1.0927835, 6);
    expect(profileExponent(1, 1.2)).toBeCloseTo(6.5847692, 6);
    // the ratio is limited, so equal angles do not give an infinite exponent
    expect(profileExponent(1, 1)).toBeCloseTo(24.6063, 3);
    expect(profileExponent(1, 0.5)).toBe(profileExponent(1, MIN_FIELD_RATIO));
  });

  it('makes equal angles a near top hat: 50 % at the stated beam angle, 10 % at 1.05 times it', () => {
    const profile = resolveBeamProfile(25, 25);
    expect(degrees(profile.beamHalf)).toBeCloseTo(12.5, 12);
    expect(degrees(profile.fieldHalf)).toBeCloseTo(12.5 * MIN_FIELD_RATIO, 12);
    expect(profileAt(profile, profile.beamHalf)).toBeCloseTo(0.5, 12);
    // 10,000 lm in a 10/10 degree beam: 423,250 cd (independent Python script, Simpson's rule, 2,000,000 steps);
    // the old 50 % point at 9.52 degrees gave 466,606 cd
    expect(Math.abs(peakCandela(lumens(10_000), resolveBeamProfile(10, 10)) / 423_249.98 - 1)).toBeLessThan(1e-6);
    expect(profileAt(profile, 0.8 * profile.fieldHalf)).toBeGreaterThan(0.99);
    expect(profileAt(profile, profile.fieldHalf)).toBeCloseTo(0.1, 12);
    expect(profileAt(profile, 1.1 * profile.fieldHalf)).toBeLessThan(0.001);
  });

  it('reads a field angle below the beam angle as the same top hat at the larger angle', () => {
    expect(resolveBeamProfile(30, 10)).toEqual(resolveBeamProfile(30, 30));
    // and it meets the normal case with no jump at the smallest ratio
    const below = resolveBeamProfile(20, 20 * 1.0499);
    const above = resolveBeamProfile(20, 20 * 1.0501);
    expect(below.exponent).toBeCloseTo(above.exponent, 1);
    expect(below.beamHalf).toBeCloseTo(above.beamHalf, 4);
  });

  it('makes a Gaussian through the one angle a file gives', () => {
    const beamOnly = resolveBeamProfile(10, undefined);
    expect(beamOnly.exponent).toBeCloseTo(2, 12);
    expect(degrees(beamOnly.fieldHalf)).toBeCloseTo(5 * GAUSSIAN_FIELD_RATIO, 12);
    const fieldOnly = resolveBeamProfile(undefined, 20);
    expect(fieldOnly.exponent).toBeCloseTo(2, 12);
    expect(degrees(fieldOnly.beamHalf)).toBeCloseTo(10 / GAUSSIAN_FIELD_RATIO, 12);
    // zero, negative and not-a-number count as missing
    expect(resolveBeamProfile(10, 0)).toEqual(beamOnly);
    expect(resolveBeamProfile(10, -4)).toEqual(beamOnly);
    expect(resolveBeamProfile(NaN, 20)).toEqual(fieldOnly);
  });

  it('uses the GDTF defaults, 25 and 25 degrees, when the file gives no angle', () => {
    expect(resolveBeamProfile()).toEqual(resolveBeamProfile(25, 25));
    expect(resolveBeamProfile(0, 0)).toEqual(resolveBeamProfile(25, 25));
  });

  it('never lights the space behind the lens', () => {
    const wide = resolveBeamProfile(170, 180);
    expect(degrees(wide.fieldHalf)).toBe(90);
    expect(profileAt(wide, 89 * D2R)).toBeGreaterThan(0);
    expect(profileAt(wide, 90 * D2R)).toBe(0);
    expect(profileAt(wide, 135 * D2R)).toBe(0);
    expect(degrees(resolveBeamProfile(400, 500).fieldHalf)).toBe(90);
  });
});
