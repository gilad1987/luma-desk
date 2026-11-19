import { Vector3 } from 'three';
import { clamp, D2R } from '../../core';
import { aimAt, dirFrom } from '../../domain/aim';
import { ATTR } from '../../domain/attributes';
import type { Fixture, PanTilt } from '../../domain/Fixture';
import type { LookPoint } from './lookArea';

/** The fixture fields the reach solver reads: the place, the hang (mount or body rotation) and the type. */
export type Aimable = Pick<Fixture, 'pos' | 'mount' | 'T' | 'rotation'>;

/**
 * The smallest tilt in degrees a moving head keeps in the look. At tilt 0 the beam leaves along the yoke axis: a hung
 * head lights its own truss shadow on the deck and a standing head lights the truss above it, and neither reads as a
 * designed position.
 */
export const MIN_TILT_DEG = 8;

/** The pose of a fixture whose place or target is not a number: a plain forward tilt, never NaN in a cue. */
const SAFE_POSE: PanTilt = { pan: 0, tilt: 45 };

const scratch = new Vector3();
const wanted = new Vector3();

/** The angle in degrees between the beam of `f` at `pose` and the line from `f` to `target`; 0 is a perfect aim. */
export function aimErrorDeg(f: Aimable, pose: PanTilt, target: LookPoint): number {
  wanted
    .set(...target)
    .sub(f.pos)
    .normalize();
  return Math.acos(clamp(dirFrom(f, pose.pan, pose.tilt, scratch).dot(wanted), -1, 1)) / D2R;
}

/**
 * The pan and tilt that point `f` at `target` for its real hang: hanging, standing on the floor or on its side on a
 * tower (`aimAt` solves in the body's own frame). The result is always inside the desk's pan and tilt ranges. A head
 * cannot look back past its own base (tilt beyond the range); the tilt then stops at the range limit in the same pan
 * plane, which is the reachable direction nearest to the target. A pose nearer than `MIN_TILT_DEG` to the yoke axis
 * is moved out to it. A tilt-only bar keeps pan 0. Never returns NaN.
 */
export function reachAim(f: Aimable, target: LookPoint): PanTilt {
  const numbers = [f.pos.x, f.pos.y, f.pos.z, ...target];
  if (!numbers.every(Number.isFinite)) return SAFE_POSE;
  const raw = aimAt(f, ...target);
  if (!Number.isFinite(raw.pan) || !Number.isFinite(raw.tilt)) return SAFE_POSE;
  const pan = clamp(raw.pan, ATTR.pan.min, ATTR.pan.max);
  const tilt = clamp(raw.tilt, ATTR.tilt.min, ATTR.tilt.max);
  if (f.T.tiltOnly || Math.abs(tilt) >= MIN_TILT_DEG) return { pan, tilt };
  return { pan, tilt: tilt < 0 ? -MIN_TILT_DEG : MIN_TILT_DEG };
}
