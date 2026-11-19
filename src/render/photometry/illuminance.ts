import { clamp } from '../../core';
import { MAX_HALF_ANGLE, MIN_DISTANCE, MIN_HALF_ANGLE } from './angles';
import { finiteOr } from './finite';
import { lux, nits, type Candela, type Lumens, type Lux, type Nits } from './units';

/**
 * How far behind the lens the virtual apex of the beam is: r0 / tan(theta_f). A lens of radius r0 is not a point:
 * the cone that leaves it meets at a point behind it. The apex gives the shape of the beam (the angle to a point,
 * the footprint). For the magnitude, `illuminance` adds it in quadrature to the distance from the lens, which keeps
 * the inverse square law finite at the lens and equal to I / d^2 far away.
 *
 * @param sourceRadius lens radius r0 in metres (GDTF `BeamRadius`)
 * @param fieldHalf field half angle in radians
 * @returns metres, 0 for a point source; also 0 (a point source) for a radius that is not finite or an angle that
 *   is not a number
 */
export function apexOffset(sourceRadius: number, fieldHalf: number): number {
  if (!Number.isFinite(sourceRadius) || Number.isNaN(fieldHalf)) return 0;
  return Math.max(sourceRadius, 0) / Math.tan(clamp(fieldHalf, MIN_HALF_ANGLE, MAX_HALF_ANGLE));
}

/**
 * The illuminance on a surface: E = I cos(incidence) / (d^2 + a^2), a = r0 / tan(theta_f).
 * Source: the inverse square law and Lambert's cosine law. A data sheet states lux as candela over the distance
 * from the lens squared, so the far field must be I / d^2: a range d + a from the apex under-reads it by 2 a / d
 * (6 % for a 10 degree Gaussian with a 5 cm lens at 10 m). d^2 + a^2 differs from d^2 by (a / d)^2 only, and at the
 * lens it gives I / a^2, the flux through the lens area.
 *
 * @param intensity candela toward the point (peak intensity times the profile at the angle of the point)
 * @param distance metres from the lens to the point; the range never reads below 1 mm
 * @param cosIncidence cosine of the angle between the light direction and the surface normal; 1 faces the light
 * @param offset metres from the virtual apex to the lens (see `apexOffset`); 0 is a point source, and so is NaN
 * @returns lux; 0 for a distance that is NaN (no point) or Infinity (the limit)
 */
export function illuminance(intensity: Candela, distance: number, cosIncidence = 1, offset = 0): Lux {
  const near = Math.max(distance, 0);
  const apex = Number.isNaN(offset) ? 0 : offset;
  const rangeSquared = Math.max(near * near + apex * apex, MIN_DISTANCE * MIN_DISTANCE);
  return lux(finiteOr((intensity * clamp(cosIncidence, 0, 1)) / rangeSquared, 0));
}

/**
 * The mean illuminance of a flux spread on a flat disc: E = Phi / (pi (D / 2)^2). It is a little below the on-axis
 * value of the same uniform cone, because the rim of the disc is farther away and tilted.
 *
 * @param flux lumens that land on the disc
 * @param diameter metres (see `beamDiameter`)
 * @returns lux
 */
export function discIlluminance(flux: Lumens, diameter: number): Lux {
  const radius = Math.max(diameter / 2, MIN_DISTANCE);
  return lux(finiteOr(flux / (Math.PI * radius * radius), 0));
}

/**
 * The luminance of a matt (Lambertian) surface: L = rho E / pi. Source: a Lambertian surface sends its reflected
 * flux rho E into a projected solid angle of pi, the same from every view direction.
 *
 * @param illuminance lux on the surface
 * @param reflectance rho, the fraction of the light the surface reflects, 0..1 (0.18 is mid grey)
 * @returns nits
 */
export function lambertLuminance(illuminance: Lux, reflectance: number): Nits {
  return nits(finiteOr((clamp(reflectance, 0, 1) * illuminance) / Math.PI, 0));
}
