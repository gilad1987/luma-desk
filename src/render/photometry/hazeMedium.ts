import { clamp } from '../../core';

/**
 * The contrast threshold that defines the visibility V: 2 %, the threshold of the eye in Koschmieder (1924). The
 * WMO meteorological optical range uses 5 % instead (sigma_t = -ln(0.05) / V = 2.996 / V); the visibility control
 * here is Koschmieder's, so a value read from a WMO instrument is 3.912 / 2.996 = 1.31 times this V.
 */
export const VISIBILITY_CONTRAST_THRESHOLD = 0.02;
/**
 * Koschmieder's constant: -ln(`VISIBILITY_CONTRAST_THRESHOLD`) = -ln(0.02) = 3.912. The visibility is the range
 * where a black object against the horizon keeps 2 % contrast. Source: Koschmieder (1924); not the WMO
 * meteorological optical range, which is the 5 % range (2.996 / sigma_t).
 */
export const KOSCHMIEDER = 3.912;
/**
 * The single scattering albedo of stage haze (glycol or oil droplets): they scatter nearly all the light they
 * stop and absorb little. 0.95 is an assumed value from the literature on fog fluids, not a measurement of a hazer.
 */
export const DEFAULT_ALBEDO = 0.95;
/** The thickest haze the control gives, as a visibility in metres: below it the room is a white wall. */
const MIN_VISIBILITY = 1;

/** Haze as a participating medium. Both coefficients are per metre. */
export interface HazeMedium {
  /** Extinction: the fraction of a ray lost per metre, by scattering and absorption together. */
  readonly sigmaT: number;
  /** Scattering: the fraction of a ray sent in new directions per metre. It is what makes a beam visible. */
  readonly sigmaS: number;
}

/**
 * The extinction coefficient for a visibility: sigma_t = 3.912 / V. Source: Koschmieder's law.
 *
 * @param visibility V in metres (the one haze control); `Infinity` or a value that is not a number is clear air
 * @returns per metre; 0 for clear air
 */
export function extinctionOf(visibility: number): number {
  if (Number.isNaN(visibility)) return 0;
  return KOSCHMIEDER / Math.max(visibility, MIN_VISIBILITY);
}

/**
 * The medium for a visibility: sigma_t = 3.912 / V and sigma_s = albedo x sigma_t.
 *
 * @param visibility V in metres
 * @param albedo sigma_s / sigma_t, 0..1; NaN reads as `DEFAULT_ALBEDO`
 */
export function hazeMedium(visibility: number, albedo = DEFAULT_ALBEDO): HazeMedium {
  const sigmaT = extinctionOf(visibility);
  return { sigmaT, sigmaS: clamp(Number.isNaN(albedo) ? DEFAULT_ALBEDO : albedo, 0, 1) * sigmaT };
}

/**
 * The fraction of light that passes a length of haze: T = exp(-sigma_t d). Source: the Beer-Lambert law.
 *
 * @param sigmaT extinction per metre
 * @param distance metres through the haze
 * @returns 0..1; 1 when sigma_t d is not a number (a NaN, or 0 x Infinity): no extinction, as for clear air
 */
export function transmittance(sigmaT: number, distance: number): number {
  const depth = Math.max(sigmaT, 0) * Math.max(distance, 0);
  return Number.isNaN(depth) ? 1 : Math.exp(-depth);
}
