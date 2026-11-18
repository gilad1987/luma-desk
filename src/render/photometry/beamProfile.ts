import { MAX_HALF_ANGLE, halfAngleOf } from './angles';
import { finiteOr } from './finite';

/**
 * The relative intensity of a beam against the angle from its axis, as a super-Gaussian through the two points a
 * GDTF `Beam` gives: I(theta) / I0 = exp(-ln2 (theta / theta_b)^n). It is 1 on the axis, 0.5 at `beamHalf` and 0.1
 * at `fieldHalf`. Source: ANSI/IES beam angle (50 % of peak) and field angle (10 % of peak), as GDTF defines them.
 */
export interface BeamProfile {
  /** Half angle in radians where the intensity is 50 % of the peak. */
  readonly beamHalf: number;
  /** Half angle in radians where the intensity is 10 % of the peak. */
  readonly fieldHalf: number;
  /** The exponent n: 2 is a Gaussian, a large value is a flat top with a short edge. No unit. */
  readonly exponent: number;
}

const LOG_LEVEL_RATIO = Math.log(Math.LN10 / Math.LN2);
/** theta_f / theta_b of a Gaussian (n = 2): sqrt(ln10 / ln2) = 1.8226. */
export const GAUSSIAN_FIELD_RATIO = Math.sqrt(Math.LN10 / Math.LN2);
/**
 * The smallest theta_f / theta_b the profile uses. Many GDTF files give equal angles, which would be a hard step
 * (n infinite): a real lens has no such edge and a step aliases in a shader. At 1.05 the edge takes 5 % of the
 * radius and n = 24.6, a near top hat.
 */
export const MIN_FIELD_RATIO = 1.05;
/** GDTF default for a `Beam` with no `BeamAngle` and no `FieldAngle`: 25 degrees for both. */
export const DEFAULT_ANGLE_DEG = 25;

/**
 * n = ln(ln10 / ln2) / ln(theta_f / theta_b), from exp(-ln2 r^n) = 0.1 at r = theta_f / theta_b.
 *
 * @param beamHalf half angle at 50 %, radians
 * @param fieldHalf half angle at 10 %, radians; a ratio below `MIN_FIELD_RATIO` reads as that ratio, a ratio that
 *   is not a finite number (an angle NaN, Infinity or a beam of 0) as a Gaussian
 * @returns the exponent, between 0 and 24.6
 */
export function profileExponent(beamHalf: number, fieldHalf: number): number {
  const ratio = finiteOr(fieldHalf / beamHalf, GAUSSIAN_FIELD_RATIO);
  return LOG_LEVEL_RATIO / Math.log(Math.max(ratio, MIN_FIELD_RATIO));
}

function usable(angleDeg: number | undefined): number | undefined {
  return angleDeg !== undefined && Number.isFinite(angleDeg) && angleDeg > 0 ? angleDeg : undefined;
}

/**
 * The profile for the angles of a GDTF `Beam`. An angle that is missing, zero, negative or not a number counts as
 * not given:
 * - both given, field wider than beam by 5 % or more: the super-Gaussian through both points;
 * - equal angles, or a field narrower than the beam (a data error): a near top hat. The 50 % point stays at the
 *   beam angle and the 10 % edge goes to beam x 1.05. The beam angle is the more reliable number: it is what a
 *   photometric lab and a data sheet measure and quote first, and the 50 % point holds most of the flux, so moving
 *   it inward (to field / 1.05) would make the peak 10 % too high for a 10 degree spot;
 * - one angle given: a Gaussian (n = 2) through it, the usual shape of a lens with one stated number;
 * - none given: the GDTF defaults (25 and 25 degrees), so a near top hat with its 50 % point at 25 degrees.
 *
 * @param beamAngleDeg GDTF `BeamAngle`: full angle at 50 % of peak, degrees
 * @param fieldAngleDeg GDTF `FieldAngle`: full angle at 10 % of peak, degrees
 */
export function resolveBeamProfile(beamAngleDeg?: number, fieldAngleDeg?: number): BeamProfile {
  const beam = usable(beamAngleDeg);
  const field = usable(fieldAngleDeg);
  let beamHalf: number;
  let fieldHalf: number;
  if (beam === undefined && field !== undefined) {
    fieldHalf = halfAngleOf(field);
    beamHalf = fieldHalf / GAUSSIAN_FIELD_RATIO;
  } else if (beam !== undefined && field === undefined) {
    beamHalf = halfAngleOf(beam);
    fieldHalf = Math.min(beamHalf * GAUSSIAN_FIELD_RATIO, MAX_HALF_ANGLE);
  } else {
    beamHalf = halfAngleOf(beam ?? DEFAULT_ANGLE_DEG);
    const stated = halfAngleOf(field ?? DEFAULT_ANGLE_DEG);
    fieldHalf = Math.min(Math.max(stated, beamHalf * MIN_FIELD_RATIO), MAX_HALF_ANGLE);
  }
  // one rule for every branch, so the three numbers always describe the same curve; it moves the 50 % point
  // inward only when the field edge is at the 90 degree limit
  beamHalf = Math.min(beamHalf, fieldHalf / MIN_FIELD_RATIO);
  return { beamHalf, fieldHalf, exponent: profileExponent(beamHalf, fieldHalf) };
}

/**
 * I(theta) / I0 = exp(-ln2 (theta / theta_b)^n) in front of the lens, 0 at 90 degrees and behind it.
 *
 * @param theta angle from the beam axis in radians; the sign does not matter (the beam is round)
 * @returns the fraction of the peak intensity, 0..1; 0 for an angle that is not a number (no direction, no light)
 */
export function profileAt(profile: BeamProfile, theta: number): number {
  const angle = Math.abs(theta);
  if (!(angle < MAX_HALF_ANGLE)) return 0;
  return finiteOr(Math.exp(-Math.LN2 * Math.pow(angle / profile.beamHalf, profile.exponent)), 0);
}
