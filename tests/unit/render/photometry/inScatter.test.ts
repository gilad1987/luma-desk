import { describe, expect, it } from 'vitest';
import {
  ISOTROPIC_PHASE,
  apexOffset,
  candela,
  coneIrradiance,
  henyeyGreenstein,
  inScatteredRadiance,
  inverseSquareIntegral,
  rayApex,
  resolveBeamProfile,
  transmittance,
  type ConeSource,
  type ScatterMedium,
  type ViewRay,
} from '../../../../src/render/photometry';
import { expectWithin } from './within';

/** A 60 degree top hat that points down from 5 m: a ray near its axis sees a constant intensity. */
const PROFILE = resolveBeamProfile(60, 60);
const DOWN: ConeSource = {
  lens: [0, 5, 0],
  axis: [0, -1, 0],
  profile: PROFILE,
  peak: candela(50_000),
  sourceRadius: 0,
};
/** A level line of sight that crosses the beam 2 m below the lens, inside its flat core. */
const ACROSS: ViewRay = { origin: [-0.3, 3, 0], direction: [1, 0, 0], length: 0.6 };
const CLEAR: ScatterMedium = { sigmaT: 0, sigmaS: 0.02, phase: () => ISOTROPIC_PHASE };

describe('in-scattering', () => {
  it('matches sigma_s p I0 times the closed form in a beam with no falloff and no extinction', () => {
    const { height, offset } = rayApex(ACROSS.origin, ACROSS.direction, DOWN.lens);
    const expected = 0.02 * ISOTROPIC_PHASE * 50_000 * inverseSquareIntegral(height, offset, 0, ACROSS.length);
    expectWithin(inScatteredRadiance(DOWN, ACROSS, CLEAR), expected, 1e-5);
    // a real lens: the squared range is d^2 + a^2 from the lens, so the closed form takes h' = sqrt(h^2 + a^2)
    const lens: ConeSource = { ...DOWN, sourceRadius: 0.1 };
    const a = apexOffset(0.1, PROFILE.fieldHalf);
    const withLens = 0.02 * ISOTROPIC_PHASE * 50_000 * inverseSquareIntegral(Math.hypot(height, a), offset, 0, 0.6);
    expectWithin(inScatteredRadiance(lens, ACROSS, CLEAR), withLens, 1e-5);
  });

  it('converges with the step count and scales with the peak intensity and with sigma_s', () => {
    const wide: ViewRay = { origin: [-6, 2, 0], direction: [1, 0, 0], length: 12 };
    const soft: ConeSource = { ...DOWN, profile: resolveBeamProfile(20, 36) };
    const reference = inScatteredRadiance(soft, wide, CLEAR, 16_384);
    expectWithin(inScatteredRadiance(soft, wide, CLEAR), reference, 1e-3);
    expectWithin(inScatteredRadiance({ ...soft, peak: candela(100_000) }, wide, CLEAR), 2 * reference, 1e-3);
    expectWithin(inScatteredRadiance(soft, wide, { ...CLEAR, sigmaS: 0.06 }), 3 * reference, 1e-3);
    // the beam is round: the same line of sight from the other side sees the same radiance
    const mirrored: ViewRay = { origin: [6, 2, 0], direction: [-1, 0, 0], length: 12 };
    expectWithin(inScatteredRadiance(soft, mirrored, CLEAR), reference, 1e-3);
  });

  it('loses light to extinction on the way from the lamp and on the way to the camera', () => {
    const hazy: ScatterMedium = { ...CLEAR, sigmaT: 0.05 };
    const point = [0, 3, 0] as const;
    expectWithin(coneIrradiance(DOWN, point, 0.05).irradiance, (50_000 / 4) * transmittance(0.05, 2), 1e-9);
    // a 4 degree beam is 14 cm wide here, so every lit point has nearly the same two path lengths
    const thin: ConeSource = { ...DOWN, profile: resolveBeamProfile(4, 4) };
    const far: ViewRay = { origin: [-20.3, 3, 0], direction: [1, 0, 0], length: 20.6 };
    const lost = inScatteredRadiance(thin, far, hazy, 65_536) / inScatteredRadiance(thin, far, CLEAR, 65_536);
    // 2 m from the lamp to the line of sight, then 20.3 m to the camera
    expectWithin(lost, transmittance(0.05, 2 + 20.3), 0.01);
  });

  it('is far brighter for a look into the beam than for a look along it (forward scattering)', () => {
    const up: ConeSource = { ...DOWN, lens: [0, 0, 0], axis: [0, 0, 1] };
    const forward: ScatterMedium = { ...CLEAR, phase: (mu) => henyeyGreenstein(mu, 0.6) };
    const into: ViewRay = { origin: [0.2, 0, 10], direction: [0, 0, -1], length: 8 };
    const along: ViewRay = { origin: [0.2, 0, 2], direction: [0, 0, 1], length: 8 };
    const ratio = inScatteredRadiance(up, into, forward) / inScatteredRadiance(up, along, forward);
    // HG at mu = 1 over mu = -1 is ((1 + g) / (1 - g))^3 = 64; the rays are a few degrees off the axis
    expect(ratio).toBeGreaterThan(40);
    expect(ratio).toBeLessThan(64);
    expect(coneIrradiance(up, [0, 0, -1], 0).irradiance).toBe(0);
  });
});
