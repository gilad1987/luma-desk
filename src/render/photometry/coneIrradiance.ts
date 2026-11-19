import { clamp, type Vec3Tuple } from '../../core';
import { MIN_DISTANCE } from './angles';
import { profileAt, type BeamProfile } from './beamProfile';
import { transmittance } from './hazeMedium';
import { apexOffset, illuminance } from './illuminance';
import { candela, lux, type Candela, type Lux } from './units';
import { addScaled, dot, lengthOf, subtract } from './vec3';

/** One beam as the haze sees it. Positions in metres, in any one world frame. */
export interface ConeSource {
  /** The centre of the lens. */
  readonly lens: Vec3Tuple;
  /** The beam direction, a unit vector. */
  readonly axis: Vec3Tuple;
  readonly profile: BeamProfile;
  /** Peak intensity in candela (see `peakCandela`). */
  readonly peak: Candela;
  /** Lens radius r0 in metres. */
  readonly sourceRadius: number;
}

/** What a beam sends to a point in the air. */
export interface ConeLight {
  /** Lux on a plane that faces the lamp. */
  readonly irradiance: Lux;
  /** The unit direction the light travels at the point (from the virtual apex through the point). */
  readonly travel: Vec3Tuple;
}

const DARK: ConeLight = { irradiance: lux(0), travel: [0, 0, 0] };

/**
 * The light of one beam at a point: E = I0 p(theta) T / (d^2 + a^2). The shape (theta, the travel direction) is
 * measured from the virtual apex behind the lens; the magnitude uses the distance d from the lens and the apex
 * offset a (see `apexOffset` and `illuminance`: I / d^2 far away, finite at the lens). T = exp(-sigma_t s) over the
 * part s of the path that lies in front of the lens. A point behind the lens plane gets nothing.
 *
 * @param sigmaT extinction of the air per metre; 0 for clear air
 */
export function coneIrradiance(source: ConeSource, point: Vec3Tuple, sigmaT: number): ConeLight {
  const offset = apexOffset(source.sourceRadius, source.profile.fieldHalf);
  const fromApex = subtract(point, addScaled(source.lens, source.axis, -offset));
  const along = dot(fromApex, source.axis);
  // also dark for a point or an axis that is not finite: there is no direction to it
  if (!(along > offset) || !Number.isFinite(along) || !Number.isFinite(lengthOf(fromApex))) return DARK;
  const range = Math.max(lengthOf(fromApex), MIN_DISTANCE);
  const theta = Math.acos(clamp(along / range, -1, 1));
  // the ray from the apex is inside the fixture until it crosses the lens plane: only the rest is in the haze
  const inHaze = (range * (along - offset)) / along;
  const intensity = source.peak * profileAt(source.profile, theta) * transmittance(sigmaT, inHaze);
  return {
    irradiance: illuminance(candela(intensity), lengthOf(subtract(point, source.lens)), 1, offset),
    travel: [fromApex[0] / range, fromApex[1] / range, fromApex[2] / range],
  };
}
