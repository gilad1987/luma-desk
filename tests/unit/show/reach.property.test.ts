/**
 * A property test of `reachAim`: for random targets and five hangs, the returned pan and tilt, turned back into a
 * beam direction by the app's own forward function (`dirFrom`), point at the target within 0.5 degree, or are the
 * nearest direction the head can reach (inside the desk's ranges, at least `MIN_TILT_DEG` off the yoke axis).
 */
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { D2R } from '../../../src/core';
import { dirFrom } from '../../../src/domain/aim';
import { ATTR } from '../../../src/domain/attributes';
import { Fixture } from '../../../src/domain/Fixture';
import type { LookPoint } from '../../../src/show/mvrLook/lookArea';
import { MIN_TILT_DEG, reachAim, type Aimable } from '../../../src/show/mvrLook/reach';
import { fx, ON_ITS_SIDE, STANDING } from './lookRig';

/** A fixed-seed generator (mulberry32), so a failure shows the same case on every run. */
function random(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const next = random(29);
const turn = (): Quaternion => new Quaternion(next() - 0.5, next() - 0.5, next() - 0.5, next() - 0.5).normalize();
const at: readonly [number, number, number] = [-4, 6, 1];
const floor = new Fixture({ id: 2, type: 'spot', pos: new Vector3(...at), mount: 'floor', fixed: null });
const HANGS: readonly (readonly [string, Aimable])[] = [
  ['hung', fx(1, 'spot', at)],
  ['on the floor with no rotation', floor],
  ['standing (quaternion)', fx(3, 'spot', at, STANDING)],
  ['on its side', fx(4, 'spot', at, ON_ITS_SIDE)],
  ...[5, 6, 7].map((id) => [`turned at random (${id})`, fx(id, 'spot', at, turn())] as const),
];
const TARGETS: readonly LookPoint[] = Array.from({ length: 12 }, () => {
  const d = new Vector3(next() - 0.5, next() - 0.5, next() - 0.5).normalize().multiplyScalar(2 + next() * 13);
  return [at[0] + d.x, at[1] + d.y, at[2] + d.z];
});

const beam = new Vector3();
/** The angle in degrees between the beam of `f` at pan, tilt (by `dirFrom`) and the direction `want`. */
const errorDeg = (f: Aimable, pan: number, tilt: number, want: Vector3): number =>
  Math.acos(Math.min(1, Math.max(-1, dirFrom(f, pan, tilt, beam).dot(want)))) / D2R;

/** The smallest error over every reachable pose: a 2-degree grid, then 0.1 degree around its best point. */
function bestReachable(f: Aimable, want: Vector3): number {
  const search = (pans: number[], tilts: number[]): [number, number, number] => {
    let best: [number, number, number] = [Infinity, 0, 0];
    for (const pan of pans)
      for (const tilt of tilts) {
        if (Math.abs(tilt) < MIN_TILT_DEG) continue;
        const e = errorDeg(f, pan, tilt, want);
        if (e < best[0]) best = [e, pan, tilt];
      }
    return best;
  };
  const steps = (from: number, to: number, step: number): number[] =>
    Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
  const [, pan, tilt] = search(steps(ATTR.pan.min, ATTR.pan.max, 2), steps(ATTR.tilt.min, ATTR.tilt.max, 2));
  const near = (centre: number, min: number, max: number): number[] =>
    steps(Math.max(min, centre - 2), Math.min(max, centre + 2), 0.1);
  return search(near(pan, ATTR.pan.min, ATTR.pan.max), near(tilt, ATTR.tilt.min, ATTR.tilt.max))[0];
}

describe.each(HANGS)('reachAim on a head %s', (_name, f) => {
  it('points at each random target within 0.5 degree, or at the nearest reachable direction', () => {
    for (const target of TARGETS) {
      const want = new Vector3(...target).sub(f.pos).normalize();
      const pose = reachAim(f, target);
      const error = errorDeg(f, pose.pan, pose.tilt, want);
      const best = bestReachable(f, want);
      expect(error, `target ${target.map((v) => v.toFixed(2)).join(',')}`).toBeLessThanOrEqual(
        Math.max(0.5, best + 0.2),
      );
    }
  });
});
