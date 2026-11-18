import { clamp } from '../../core';

/**
 * The isotropic phase function: p = 1 / (4 pi) per steradian, the same in every direction. Every phase function
 * here integrates to 1 over the sphere, so sigma_s alone says how much light is scattered and the phase function
 * only says where it goes.
 */
export const ISOTROPIC_PHASE = 1 / (4 * Math.PI);

/** Past this the Henyey-Greenstein lobe is a spike that no sample count resolves. */
const MAX_ASYMMETRY = 0.99;

/** A forward and a backward Henyey-Greenstein lobe: the usual fit for droplets near the wavelength of light. */
export interface TwoLobe {
  /** Asymmetry g of the forward lobe, 0..1. */
  readonly forward: number;
  /** Asymmetry g of the backward lobe, -1..0. */
  readonly back: number;
  /** The share of the scattered light in the forward lobe, 0..1. */
  readonly forwardWeight: number;
}

/**
 * Starting values for stage haze: droplets of about 1 micrometre scatter mostly forward (a beam that points at the
 * viewer is far brighter than one that points away) with a weak return toward the lamp. Assumed from Mie theory
 * for that size; not measured on a hazer. The mean cosine is 0.9 x 0.8 - 0.1 x 0.3 = 0.69.
 */
export const HAZE_LOBES: TwoLobe = { forward: 0.8, back: -0.3, forwardWeight: 0.9 };

/**
 * The Henyey-Greenstein phase function: p(mu) = (1 - g^2) / (4 pi (1 + g^2 - 2 g mu)^1.5).
 * Source: Henyey and Greenstein (1941). g = 0 is isotropic.
 *
 * @param mu cosine of the angle between the direction the light travels and the direction to the viewer:
 *   1 is a look straight into the beam, -1 a look along it from behind the lamp
 * @param g asymmetry, the mean of mu: limited to -0.99..0.99; NaN reads as 0 (isotropic)
 * @returns per steradian; a mu that is NaN reads as 0 (a side view)
 */
export function henyeyGreenstein(mu: number, g: number): number {
  const asymmetry = clamp(Number.isNaN(g) ? 0 : g, -MAX_ASYMMETRY, MAX_ASYMMETRY);
  const square = asymmetry * asymmetry;
  const cosine = clamp(Number.isNaN(mu) ? 0 : mu, -1, 1);
  return ((1 - square) * ISOTROPIC_PHASE) / Math.pow(1 + square - 2 * asymmetry * cosine, 1.5);
}

/**
 * The two-lobe mix: p(mu) = w HG(mu, g_forward) + (1 - w) HG(mu, g_back). It stays normalised because the weights
 * sum to 1.
 *
 * @param mu cosine of the scattering angle (see `henyeyGreenstein`)
 * @returns per steradian; a `forwardWeight` that is NaN reads as that of `HAZE_LOBES`
 */
export function twoLobePhase(mu: number, lobes: TwoLobe = HAZE_LOBES): number {
  const share = Number.isNaN(lobes.forwardWeight) ? HAZE_LOBES.forwardWeight : lobes.forwardWeight;
  const weight = clamp(share, 0, 1);
  return weight * henyeyGreenstein(mu, lobes.forward) + (1 - weight) * henyeyGreenstein(mu, lobes.back);
}
