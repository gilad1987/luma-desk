import { D2R } from '../../core';
import { halfAngleOf } from './angles';
import { finiteOr } from './finite';

/** The lit ellipse a round beam makes on a flat surface it meets at an angle. Lengths in metres. */
export interface Footprint {
  /** Half the length along the tilt direction. */
  readonly semiMajor: number;
  /** Half the width across the tilt direction. */
  readonly semiMinor: number;
  /** How far the centre of the ellipse lies beyond the point the beam axis hits, away from the fixture. */
  readonly centreOffset: number;
}

/**
 * The widest half angle `beamDiameter` uses: 89.9 degrees. At 90 degrees tan(theta) is 1.6e16 (rounding of pi / 2),
 * a diameter no caller can use; capped, 180 degrees gives 2 d x 573, a disc that covers any stage and keeps the
 * mean illuminance on it finite and near 0. A finite number and not `Infinity`, so the caller needs no special case.
 */
const MAX_SPREAD_HALF_ANGLE = 89.9 * D2R;

/**
 * The diameter of the beam at a distance: D = 2 (r0 + d tan(theta)), theta = half of the full angle.
 * Source: the geometry of a cone that leaves a lens of radius r0.
 *
 * @param distance metres from the lens along the beam axis
 * @param angleDeg full angle in degrees (field angle for the visible edge, beam angle for the 50 % width); above
 *   179.8 degrees it reads as 179.8 (see `MAX_SPREAD_HALF_ANGLE`)
 * @param sourceRadius lens radius r0 in metres
 * @returns metres; 0 when the distance or the radius is not finite (see `finiteOr`)
 */
export function beamDiameter(distance: number, angleDeg: number, sourceRadius = 0): number {
  const theta = Math.min(halfAngleOf(angleDeg), MAX_SPREAD_HALF_ANGLE);
  return finiteOr(2 * (Math.max(sourceRadius, 0) + Math.max(distance, 0) * Math.tan(theta)), 0);
}

/**
 * The footprint of the beam on a plane tilted by the incidence angle i (0 = the beam hits square on). With the
 * virtual apex at d' = d + r0 / tan(theta) from the hit point and A = cos^2(i) - sin^2(theta):
 * a = d' sin(theta) cos(theta) cos(i) / A, b = d' sin(theta) cos(i) / sqrt(A), offset = d' sin^2(theta) sin(i) / A.
 * Source: the conic section of the cone x^2 + y^2 = z^2 tan^2(theta) with the plane.
 *
 * @param distance metres from the lens to the plane along the beam axis
 * @param angleDeg full cone angle in degrees
 * @param incidenceDeg angle between the beam axis and the plane normal, degrees
 * @param sourceRadius lens radius r0 in metres
 * @returns the ellipse, or `undefined` when i + theta reaches 90 degrees: the far edge of the beam then never
 *   meets the plane (a parabola or hyperbola), so there is no closed footprint. Also `undefined` for an incidence
 *   that is not a number, or a distance or radius that is not finite.
 */
export function footprintEllipse(
  distance: number,
  angleDeg: number,
  incidenceDeg: number,
  sourceRadius = 0,
): Footprint | undefined {
  const theta = halfAngleOf(angleDeg);
  const incidence = Math.abs(incidenceDeg) * D2R;
  if (!(incidence + theta < Math.PI / 2 - 1e-6)) return undefined;
  if (!Number.isFinite(distance) || !Number.isFinite(sourceRadius)) return undefined;
  const range = Math.max(distance, 0) + Math.max(sourceRadius, 0) / Math.tan(theta);
  const sine = Math.sin(theta);
  const cosine = Math.cos(incidence);
  const a = cosine * cosine - sine * sine;
  return {
    semiMajor: (range * sine * Math.cos(theta) * cosine) / a,
    semiMinor: (range * sine * cosine) / Math.sqrt(a),
    centreOffset: (range * sine * sine * Math.sin(incidence)) / a,
  };
}
