import { describe, expect, it } from 'vitest';
import {
  QUADRATURE_POINTS,
  gaussLegendre,
  integrate,
  lumens,
  peakCandela,
  profileSolidAngle,
  resolveBeamProfile,
} from '../../../../src/render/photometry';
import { expectWithin } from './within';

describe('Gauss-Legendre quadrature', () => {
  it('has weights that sum to the length of [-1, 1] and points that mirror', () => {
    for (const count of [1, 2, 7, 64]) {
      const rule = gaussLegendre(count);
      expect(rule).toHaveLength(count);
      expect(rule.reduce((sum, point) => sum + point.weight, 0)).toBeCloseTo(2, 12);
      expect(rule.reduce((sum, point) => sum + point.x, 0)).toBeCloseTo(0, 12);
      expect(rule.every((point) => Math.abs(point.x) < 1 && point.weight > 0)).toBe(true);
    }
  });

  it('is exact for a polynomial of degree 2 n - 1', () => {
    // 4 points: degree 7. integral_0^2 x^7 dx = 2^8 / 8 = 32
    expect(integrate((x) => x ** 7, 0, 2, 4)).toBeCloseTo(32, 10);
    expect(integrate(Math.sin, 0, Math.PI, 16)).toBeCloseTo(2, 12);
  });

  it('gives the same rule object for the same count', () => {
    expect(gaussLegendre(64)).toBe(gaussLegendre(64));
  });
});

describe('profile integral convergence', () => {
  const cases: readonly (readonly [beam: number, field: number])[] = [
    [10, 10],
    [10, 12],
    [10, 18.23],
    [10, 30],
    [1, 1.8],
    [60, 110],
    [120, 170],
  ];

  it.each(cases)('64 points agree with 1024 points for beam %s, field %s degrees', (beam, field) => {
    const profile = resolveBeamProfile(beam, field);
    expect(QUADRATURE_POINTS).toBe(64);
    expectWithin(profileSolidAngle(profile), profileSolidAngle(profile, 1024), 1e-6);
    expectWithin(peakCandela(lumens(1), profile, 32), peakCandela(lumens(1), profile, 1024), 1e-4);
  });

  it('holds for a very soft beam (field 8 times the beam, n below 1), where the profile has a cusp on the axis', () => {
    const profile = resolveBeamProfile(5, 40);
    expect(profile.exponent).toBeLessThan(1);
    expectWithin(profileSolidAngle(profile), profileSolidAngle(profile, 1024), 1e-4);
  });
});
