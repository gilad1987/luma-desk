import { Vector3 } from 'three';
import { clamp, D2R } from '../core';
import type { Fixture, PanTilt } from './Fixture';

/**
 * The unit beam direction of a fixture at a pan/tilt, written into `out` so the per-frame render loop allocates
 * nothing. Floor units point up at tilt 0; every other mount points down. A fixture with a `rotation` takes the hang
 * direction turned by that quaternion and ignores `mount` (G2), so circle trusses and MVR imports aim by their body.
 */
export function dirFrom(f: Pick<Fixture, 'mount' | 'rotation'>, pan: number, tilt: number, out: Vector3): Vector3 {
  const p = pan * D2R,
    t = tilt * D2R,
    st = Math.sin(t);
  if (f.rotation) return out.set(st * Math.sin(p), -Math.cos(t), st * Math.cos(p)).applyQuaternion(f.rotation);
  if (f.mount === 'floor') out.set(st * Math.sin(p), Math.cos(t), st * Math.cos(p));
  else out.set(st * Math.sin(p), -Math.cos(t), st * Math.cos(p));
  return out;
}

/**
 * The pan/tilt that points a fixture at a point. It lives in the domain because the rig build aims the profiles while
 * it creates them. Results are rounded to 0.1 degree so presets store short, readable values; pan stays within ±90 by
 * flipping tilt, and pan is 0 for a near-vertical beam so presets do not spin the head. A fixture with a `rotation`
 * is aimed in its own rest pose (G2): the target direction is turned back by the inverse quaternion, then the hang
 * formula applies and `mount` is ignored, which makes the result the inverse of `dirFrom`.
 */
export function aimAt(
  f: Pick<Fixture, 'pos' | 'mount' | 'T' | 'rotation'>,
  tx: number,
  ty: number,
  tz: number,
): PanTilt {
  const d = new Vector3(tx, ty, tz).sub(f.pos).normalize();
  if (f.rotation) d.applyQuaternion(f.rotation.clone().invert());
  const isFloorPose = !f.rotation && f.mount === 'floor';
  // A tilt-only bar sweeps only its own Y-Z plane (dirFrom with pan 0), so aim at the target's projection on it.
  if (f.T.tiltOnly)
    return { pan: 0, tilt: +clamp(Math.atan2(d.z, isFloorPose ? d.y : -d.y) / D2R, -95, 95).toFixed(1) };
  let t = Math.acos(clamp(isFloorPose ? d.y : -d.y, -1, 1)) / D2R;
  let p = Math.atan2(d.x, d.z) / D2R;
  if (p > 90) {
    p -= 180;
    t = -t;
  } else if (p < -90) {
    p += 180;
    t = -t;
  }
  if (t < 0.5 && t > -0.5) p = 0;
  return { pan: +p.toFixed(1), tilt: +clamp(t, -135, 135).toFixed(1) };
}
