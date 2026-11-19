import { clamp, D2R } from '../../core';
import { MIN_HALF_ANGLE } from './angles';
import { finiteOr } from './finite';
import { candela, type Candela, type Lumens } from './units';

/** The narrowest full cone angle in degrees: twice `MIN_HALF_ANGLE` (0.1 degrees). */
const MIN_FULL_ANGLE_DEG = (2 * MIN_HALF_ANGLE) / D2R;

/**
 * The solid angle of a right circular cone: Omega = 2 pi (1 - cos(theta)), theta = half of the full angle.
 * Source: the area of a spherical cap of the unit sphere.
 *
 * It is computed as 4 pi sin^2(theta / 2), the same value, because `1 - cos` loses its digits for a narrow beam.
 *
 * @param fieldAngleDeg full cone angle in degrees, limited to 0..360; a value that is not a number is no cone
 * @returns steradians (0 for no cone, 2 pi for a hemisphere, 4 pi for the sphere)
 */
export function coneSolidAngle(fieldAngleDeg: number): number {
  if (Number.isNaN(fieldAngleDeg)) return 0;
  const sine = Math.sin((clamp(fieldAngleDeg, 0, 360) * D2R) / 4);
  return 4 * Math.PI * sine * sine;
}

/**
 * The intensity of a source that spreads its flux evenly in a cone and sends nothing outside it: I = Phi / Omega.
 * Source: the definition of the candela (lumens per steradian). It is the reference case for the profiles: a real
 * beam of the same field angle has a lower peak when its edge is soft.
 *
 * It accepts the same angles as `coneSolidAngle`, up to 360 degrees (the full sphere: Phi / 4 pi), so the two agree.
 *
 * @param flux luminous flux in lumens
 * @param fieldAngleDeg full cone angle in degrees, 0.1..360; below 0.1 degrees (or not a number) it reads as 0.1,
 *   so the result stays finite
 * @returns candela, the same in every direction inside the cone
 */
export function uniformConeIntensity(flux: Lumens, fieldAngleDeg: number): Candela {
  const angle = Number.isNaN(fieldAngleDeg) ? MIN_FULL_ANGLE_DEG : Math.max(fieldAngleDeg, MIN_FULL_ANGLE_DEG);
  return candela(finiteOr(flux / coneSolidAngle(angle), 0));
}
