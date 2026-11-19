import { describe, expect, it } from 'vitest';
import * as p from '../../../../src/render/photometry';

const FLUX = p.lumens(10_000);
const PROFILES = [p.resolveBeamProfile(10, 10), p.resolveBeamProfile(10, 18.2), p.resolveBeamProfile(40, 120)];

type Inputs = readonly [beamDeg: number, fieldDeg: number, flux: number, distance: number];

/** Every number a fixture with these angles and this flux gives to the renderer, at the worst places. */
function everything(inputs: Inputs): number[] {
  const [beamDeg, fieldDeg, flux, distance] = inputs;
  const profile = p.resolveBeamProfile(beamDeg, fieldDeg);
  const emitted = p.emittedFlux(flux, 1);
  const peak = p.peakCandela(emitted, profile);
  const offset = p.apexOffset(0, profile.fieldHalf);
  const source = { lens: [0, 0, 0], axis: [0, 0, 1], profile, peak, sourceRadius: 0 } as const;
  const ray = { origin: [0, 0, distance], direction: [1, 0, 0], length: 5 } as const;
  const medium = { ...p.hazeMedium(100), phase: (mu: number) => p.twoLobePhase(mu) };
  return [
    profile.beamHalf,
    profile.fieldHalf,
    profile.exponent,
    peak,
    p.profileAt(profile, 0),
    p.profileAt(profile, Math.PI),
    p.coneSolidAngle(fieldDeg),
    p.uniformConeIntensity(emitted, fieldDeg),
    p.illuminance(peak, distance, 1, offset),
    p.lambertLuminance(p.illuminance(peak, distance), 0.18),
    p.beamDiameter(distance, fieldDeg),
    p.discIlluminance(emitted, p.beamDiameter(distance, fieldDeg)),
    p.lensLuminance(peak, 0, p.nits(1e9)),
    p.uniformLensLuminance(emitted, 0, fieldDeg, p.nits(1e9)),
    p.coneIrradiance(source, [0, 0, distance], 0.04).irradiance,
    p.inScatteredRadiance(source, ray, medium, 64),
  ];
}

describe('photometry properties', () => {
  const cases: readonly (readonly [name: string, inputs: Inputs])[] = [
    ['angle 0', [0, 0, 10_000, 10]],
    ['angle 180', [180, 180, 10_000, 10]],
    ['flux 0', [10, 18, 0, 10]],
    ['distance 0', [10, 18, 10_000, 0]],
    ['equal beam and field angles', [25, 25, 10_000, 10]],
    ['field below beam', [30, 10, 10_000, 0]],
    ['angles that are not numbers', [NaN, NaN, NaN, 0]],
  ];

  it.each(cases)('gives no NaN and no Infinity for %s', (_name, inputs) => {
    for (const value of everything(inputs)) expect(Number.isFinite(value)).toBe(true);
  });

  it('gives no light for flux 0', () => {
    const profile = p.resolveBeamProfile(10, 18);
    expect(p.peakCandela(p.emittedFlux(0, 1), profile)).toBe(0);
    expect(p.peakCandela(p.emittedFlux(10_000, 0), profile)).toBe(0);
    expect(p.emittedFlux(10_000, 0.5, 0.5)).toBe(2_500);
    expect(p.emittedFlux(10_000, 7, 3)).toBe(10_000);
  });

  it.each(PROFILES)('falls off monotonically from the axis and is the same on both sides (%#)', (profile) => {
    let last = p.profileAt(profile, 0);
    expect(last).toBe(1);
    for (let degrees = 0.25; degrees <= 180; degrees += 0.25) {
      const theta = (degrees * Math.PI) / 180;
      const value = p.profileAt(profile, theta);
      expect(value).toBeLessThanOrEqual(last);
      expect(p.profileAt(profile, -theta)).toBe(value);
      last = value;
    }
    expect(last).toBe(0);
  });

  it('falls off monotonically with distance, with a wider beam and through haze', () => {
    const peak = p.peakCandela(FLUX, p.resolveBeamProfile(10, 18));
    const offset = p.apexOffset(0.05, (9 * Math.PI) / 180);
    for (let d = 0; d < 50; d += 0.5) {
      expect(p.illuminance(peak, d + 0.5, 1, offset)).toBeLessThan(p.illuminance(peak, d, 1, offset));
      expect(p.transmittance(0.04, d + 0.5)).toBeLessThan(p.transmittance(0.04, d));
    }
    for (let field = 2; field < 170; field += 4) {
      const wider = p.peakCandela(FLUX, p.resolveBeamProfile(field + 4, (field + 4) * 1.5));
      expect(wider).toBeLessThan(p.peakCandela(FLUX, p.resolveBeamProfile(field, field * 1.5)));
    }
    for (let mu = -1; mu < 1; mu += 0.05) {
      expect(p.henyeyGreenstein(mu + 0.05, 0.6)).toBeGreaterThan(p.henyeyGreenstein(mu, 0.6));
    }
  });

  it('keeps the illuminance at the lens finite: the flux passes the lens area, not a point', () => {
    // the apex of the same uniform 10 degree cone: its edge is at 5 degrees
    const atLens = p.illuminance(p.uniformConeIntensity(FLUX, 10), 0, 1, p.apexOffset(0.05, (5 * Math.PI) / 180));
    // 10,000 lm through a disc of 5 cm radius (I / a^2 at d = 0), within the small-angle error of tan against the
    // solid angle
    expect(Math.abs(atLens / (10_000 / (Math.PI * 0.05 * 0.05)) - 1)).toBeLessThan(0.01);
  });
});
