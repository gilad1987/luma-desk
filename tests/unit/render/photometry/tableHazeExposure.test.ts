import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ALBEDO,
  EV_BROADCAST_CAMERA,
  EV_EYE_DARK_HALL,
  EV_HAZE_PHOTO,
  HAZE_LOBES,
  ISOTROPIC_PHASE,
  KOSCHMIEDER,
  VISIBILITY_CONTRAST_THRESHOLD,
  ev100,
  exposureScale,
  extinctionOf,
  hazeMedium,
  henyeyGreenstein,
  saturationLuminance,
  transmittance,
  twoLobePhase,
} from '../../../../src/render/photometry';
import { expectWithin, midpoint } from './within';

/** 2 pi integral_-1^1 p(mu) dmu: the phase function over the whole sphere. */
function overSphere(phase: (mu: number) => number): number {
  return 2 * Math.PI * midpoint(phase, -1, 1, 200_000);
}

describe('photometry validation table: haze and exposure', () => {
  it.each([
    [50, 0.0782],
    [100, 0.0391],
    [200, 0.0196],
  ])('visibility %s m gives sigma_t = %s per metre', (visibility, expected) => {
    expectWithin(extinctionOf(visibility), expected);
    expect(extinctionOf(visibility)).toBeCloseTo(3.912 / visibility, 12);
    const medium = hazeMedium(visibility);
    expect(medium.sigmaT).toBe(extinctionOf(visibility));
    expect(medium.sigmaS).toBeCloseTo(DEFAULT_ALBEDO * medium.sigmaT, 12);
  });

  it('leaves 2 % of the contrast at the visibility range (Koschmieder)', () => {
    expectWithin(transmittance(extinctionOf(80), 80), 0.02, 1e-3);
    // -ln(0.02) = 3.912023 by hand; the WMO 5 % range would be -ln(0.05) = 2.995732
    expect(VISIBILITY_CONTRAST_THRESHOLD).toBe(0.02);
    expectWithin(KOSCHMIEDER, 3.912023, 1e-5);
    expect(transmittance(extinctionOf(80), 0)).toBe(1);
    expect(hazeMedium(Infinity)).toEqual({ sigmaT: 0, sigmaS: 0 });
    expect(hazeMedium(100, 0.5).sigmaS).toBeCloseTo(0.01956, 12);
  });

  it('phase functions integrate to 1 over the sphere within 1e-4', () => {
    expect(Math.abs(overSphere(() => ISOTROPIC_PHASE) - 1)).toBeLessThan(1e-4);
    expect(Math.abs(overSphere((mu) => henyeyGreenstein(mu, 0.6)) - 1)).toBeLessThan(1e-4);
    expect(Math.abs(overSphere((mu) => henyeyGreenstein(mu, -0.3)) - 1)).toBeLessThan(1e-4);
    expect(Math.abs(overSphere((mu) => twoLobePhase(mu)) - 1)).toBeLessThan(1e-4);
    const mix = { forward: 0.6, back: -0.4, forwardWeight: 0.7 };
    expect(Math.abs(overSphere((mu) => twoLobePhase(mu, mix)) - 1)).toBeLessThan(1e-4);
  });

  it('Henyey-Greenstein has g as its mean cosine and is isotropic at g = 0', () => {
    expect(2 * Math.PI * midpoint((mu) => mu * henyeyGreenstein(mu, 0.6), -1, 1, 200_000)).toBeCloseTo(0.6, 4);
    expect(henyeyGreenstein(0.3, 0)).toBeCloseTo(ISOTROPIC_PHASE, 15);
    const mean = 2 * Math.PI * midpoint((mu) => mu * twoLobePhase(mu), -1, 1, 200_000);
    expect(mean).toBeCloseTo(HAZE_LOBES.forwardWeight * HAZE_LOBES.forward + 0.1 * HAZE_LOBES.back, 4);
  });

  it('f/2.8, 1/50 s, ISO 800 is EV100 5.61', () => {
    expectWithin(ev100(2.8, 1 / 50, 800), 5.61);
    expect(ev100(2.8, 1 / 50, 800)).toBeCloseTo(5.6147098, 6);
    expect(ev100(1, 1, 100)).toBe(0);
    // one stop less light for one stop of aperture
    expect(ev100(4, 1 / 50, 800) - ev100(2.8, 1 / 50, 800)).toBeCloseTo(2 * Math.log2(4 / 2.8), 12);
  });

  it('scales by 1 / (1.2 x 2^EV100), with the three presets as constants', () => {
    expect([EV_EYE_DARK_HALL, EV_BROADCAST_CAMERA, EV_HAZE_PHOTO]).toEqual([6, 8, 5]);
    expect(exposureScale(EV_EYE_DARK_HALL)).toBeCloseTo(1 / 76.8, 15);
    expect(exposureScale(EV_BROADCAST_CAMERA)).toBeCloseTo(1 / 307.2, 15);
    expect(exposureScale(EV_HAZE_PHOTO)).toBeCloseTo(1 / 38.4, 15);
    expect(saturationLuminance(6) * exposureScale(6)).toBeCloseTo(1, 15);
  });
});
