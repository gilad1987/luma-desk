import { clamp, D2R } from '../../core';

/**
 * The narrowest half angle the formulas accept, in radians (0.05 degrees). A cone of no width has no solid angle, so
 * its intensity would be infinite; a fixture file that says 0 has a data error, not a perfect laser.
 */
export const MIN_HALF_ANGLE = 0.05 * D2R;
/** The widest half angle, in radians (90 degrees): a lens sends light into the hemisphere in front of it only. */
export const MAX_HALF_ANGLE = Math.PI / 2;
/** The shortest range for the inverse square law, in metres: a point source has no lux at its own position. */
export const MIN_DISTANCE = 1e-3;

/**
 * The half angle in radians of a full cone angle in degrees (GDTF `BeamAngle` and `FieldAngle` are full angles),
 * limited to `MIN_HALF_ANGLE`..`MAX_HALF_ANGLE`. A value that is not a number gives the narrowest angle.
 */
export function halfAngleOf(fullAngleDeg: number): number {
  if (Number.isNaN(fullAngleDeg)) return MIN_HALF_ANGLE;
  return clamp((fullAngleDeg / 2) * D2R, MIN_HALF_ANGLE, MAX_HALF_ANGLE);
}
