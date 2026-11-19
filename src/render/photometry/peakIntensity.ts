import { clamp } from '../../core';
import { MAX_HALF_ANGLE } from './angles';
import { finiteOr } from './finite';
import { profileAt, type BeamProfile } from './beamProfile';
import { integrate } from './quadrature';
import { candela, lumens, type Candela, type Lumens } from './units';

/** Points per part of the profile integral. 64 gives the peak to better than 1e-6; the tests pin the convergence. */
export const QUADRATURE_POINTS = 64;
/** The profile is integrated out to where it is below this fraction of the peak; the rest holds no flux. */
const NEGLIGIBLE = 1e-12;

/**
 * The flux a fixture emits now: Phi = LuminousFlux x dimmer x colour transmission.
 *
 * @param luminousFlux GDTF `LuminousFlux` in lumens (the output at full, open white)
 * @param dimmer the dimmer as a fraction of full light output, 0..1 (after the dimmer curve, not the DMX value)
 * @param transmission the luminous transmittance of the colour system, 0..1 (1 = open white)
 * @returns lumens; 0 for a flux that is negative or not finite, and for a dimmer or transmission that is NaN
 *   (an unknown setting gives no light, see `finiteOr`)
 */
export function emittedFlux(luminousFlux: number, dimmer: number, transmission = 1): Lumens {
  if (!Number.isFinite(luminousFlux) || luminousFlux <= 0) return lumens(0);
  return lumens(luminousFlux * clamp(dimmer, 0, 1) * clamp(transmission, 0, 1));
}

/**
 * The solid angle a beam would fill at its peak intensity: Omega_eff = 2 pi integral_0^(pi/2) p(theta) sin(theta)
 * dtheta, p = I / I0. Source: Phi = integral of I over the sphere, for a round beam that emits forward only.
 *
 * The integral is cut where p is below 1e-12 and split at the field angle, each part by one Gauss-Legendre rule: a
 * 1 degree beam and a soft 60 degree wash then get the same accuracy from the same number of points.
 *
 * @param points Gauss-Legendre points per part
 * @returns steradians
 */
export function profileSolidAngle(profile: BeamProfile, points = QUADRATURE_POINTS): number {
  const reach = profile.beamHalf * Math.pow(-Math.log(NEGLIGIBLE) / Math.LN2, 1 / profile.exponent);
  const end = Math.min(reach, MAX_HALF_ANGLE);
  const split = Math.min(profile.fieldHalf, end);
  const ring = (theta: number): number => profileAt(profile, theta) * Math.sin(theta);
  return 2 * Math.PI * (integrate(ring, 0, split, points) + integrate(ring, split, end, points));
}

/**
 * The peak (on axis) intensity that makes the profile hold exactly the flux: I0 = Phi / Omega_eff. So the profile
 * only moves the light inside the beam; it never adds or removes lumens.
 *
 * @param flux emitted flux in lumens (see `emittedFlux`)
 * @returns candela on the beam axis
 */
export function peakCandela(flux: Lumens, profile: BeamProfile, points = QUADRATURE_POINTS): Candela {
  return candela(finiteOr(flux / profileSolidAngle(profile, points), 0));
}
