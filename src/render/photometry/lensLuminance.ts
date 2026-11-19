import { finiteOr } from './finite';
import { coneSolidAngle } from './solidAngle';
import { nits, type Candela, type Lumens, type Nits } from './units';

/** The smallest lens radius the formula uses, in metres (1 mm): a lens of no area has no luminance. */
const MIN_LENS_RADIUS = 1e-3;

function lensArea(lensRadius: number): number {
  const radius = Math.max(lensRadius, MIN_LENS_RADIUS);
  return Math.PI * radius * radius;
}

/**
 * The luminance of the lens face seen from inside the beam: L = I / A_lens, A_lens = pi r0^2.
 * Source: the definition of luminance (intensity per projected source area) for a lens that is evenly filled.
 *
 * The physical value is very high (10,000 lm in 10 degrees from a 5 cm lens is 53 million nits). A bloom pass and a
 * half float target cannot hold that, so the caller gives a cap in nits; pass `Infinity` for the physical value.
 *
 * @param intensity candela toward the viewer (peak intensity times the profile at the view angle)
 * @param lensRadius r0 in metres (GDTF `BeamRadius`)
 * @param cap the highest value returned, in nits
 * @returns nits; 0 for a radius that is NaN, and for a result that is not finite (an infinite intensity with no
 *   cap), see `finiteOr`
 */
export function lensLuminance(intensity: Candela, lensRadius: number, cap: Nits): Nits {
  return nits(finiteOr(Math.min(intensity / lensArea(lensRadius), cap), 0));
}

/**
 * The lens luminance of a uniform cone straight from the flux: L = Phi / (A_lens Omega_field), A_lens = pi r0^2.
 * Source: conservation of etendue, Phi = L A Omega for a small cone.
 *
 * @param flux emitted flux in lumens
 * @param lensRadius r0 in metres
 * @param fieldAngleDeg full field angle in degrees
 * @param cap the highest value returned, in nits (see `lensLuminance`)
 * @returns nits; 0 when it is not finite (see `lensLuminance`)
 */
export function uniformLensLuminance(flux: Lumens, lensRadius: number, fieldAngleDeg: number, cap: Nits): Nits {
  const solidAngle = Math.max(coneSolidAngle(fieldAngleDeg), coneSolidAngle(0.1));
  return nits(finiteOr(Math.min(flux / (lensArea(lensRadius) * solidAngle), cap), 0));
}
