import { describe, expect, it } from 'vitest';
import {
  EV_EYE_DARK_HALL,
  exposureScale,
  lensLuminance,
  lumens,
  nits,
  peakCandela,
  resolveBeamProfile,
  uniformConeIntensity,
  uniformLensLuminance,
} from '../../../../src/render/photometry';
import { expectWithin } from './within';

const FLUX = lumens(10_000);
const NO_CAP = nits(Infinity);

describe('lens face luminance', () => {
  it('is the intensity over the lens area: 10,000 lm in 10 degrees from a 5 cm lens is 53 million nits', () => {
    const intensity = uniformConeIntensity(FLUX, 10);
    expectWithin(lensLuminance(intensity, 0.05, NO_CAP), 418_245.2455 / (Math.PI * 0.05 * 0.05), 1e-9);
    expectWithin(lensLuminance(intensity, 0.05, NO_CAP), 5.3253e7, 1e-4);
  });

  it('is Phi / (A_lens Omega) for a uniform cone, the same number from the flux', () => {
    const fromFlux = uniformLensLuminance(FLUX, 0.05, 10, NO_CAP);
    expectWithin(fromFlux, lensLuminance(uniformConeIntensity(FLUX, 10), 0.05, NO_CAP), 1e-12);
    expectWithin(fromFlux, 10_000 / (Math.PI * 0.05 * 0.05 * 0.023909417), 1e-8);
  });

  it('conserves etendue: half the lens radius is four times the luminance, a wider cone is less', () => {
    const small = uniformLensLuminance(FLUX, 0.025, 10, NO_CAP);
    expectWithin(small, 4 * uniformLensLuminance(FLUX, 0.05, 10, NO_CAP), 1e-12);
    expect(uniformLensLuminance(FLUX, 0.05, 40, NO_CAP)).toBeLessThan(uniformLensLuminance(FLUX, 0.05, 10, NO_CAP));
  });

  it('never returns more than the cap, so the bloom gets a bounded input', () => {
    // the cap as the engine would set it: 64 times display white at the exposure in use
    const cap = nits(64 / exposureScale(EV_EYE_DARK_HALL));
    const peak = peakCandela(FLUX, resolveBeamProfile(4, 6));
    expect(lensLuminance(peak, 0.05, cap)).toBe(cap);
    expect(uniformLensLuminance(FLUX, 0.05, 10, cap)).toBe(cap);
    expect(lensLuminance(peak, 0, cap)).toBe(cap);
    expect(uniformLensLuminance(FLUX, 0, 0, cap)).toBe(cap);
    // a dim source stays below it and is not changed
    expect(lensLuminance(peakCandela(lumens(0.001), resolveBeamProfile(60, 90)), 0.1, cap)).toBeLessThan(cap);
  });

  it('is 0 for no light, and finite without a lens radius when a cap is given', () => {
    expect(lensLuminance(peakCandela(lumens(0), resolveBeamProfile(10, 18)), 0.05, NO_CAP)).toBe(0);
    expect(Number.isFinite(lensLuminance(uniformConeIntensity(FLUX, 10), 0, NO_CAP))).toBe(true);
  });
});
