import type { Vec3Tuple } from '../../core';
import type { StageBounds } from '../../domain/stage/types';

const AXES = [0, 1, 2] as const;

/** Whether `p` is in the box grown by `side` in plan and by `up` in height. */
export const holds = ({ min, max }: StageBounds, p: Vec3Tuple, side = 0, up = 0): boolean =>
  AXES.every((a) => p[a] >= min[a] - (a === 1 ? up : side) && p[a] <= max[a] + (a === 1 ? up : side));

/** Whether two boxes are more than `gap` apart on some axis. */
export const isApart = (a: StageBounds, b: StageBounds, gap = 0): boolean =>
  AXES.some((axis) => a.min[axis] > b.max[axis] + gap || a.max[axis] < b.min[axis] - gap);

/** The longest side of a box (m). */
export const longestSide = ({ min, max }: StageBounds): number => Math.max(...AXES.map((a) => max[a] - min[a]));

/**
 * How far along the ray from `from` in the unit direction `dir` the box begins: 0 for a ray that starts in it, and
 * Infinity for one that misses it (the slab test: the ray is in the box where it is between both sides of each axis).
 */
export function entry(from: Vec3Tuple, dir: Vec3Tuple, { min, max }: StageBounds): number {
  let [near, far] = [0, Infinity];
  for (const a of AXES) {
    // a ray along a side never crosses it: it is between the two sides for its whole length, or never
    if (dir[a] === 0) {
      if (from[a] < min[a] || from[a] > max[a]) return Infinity;
      continue;
    }
    const [lo, hi] = [(min[a] - from[a]) / dir[a], (max[a] - from[a]) / dir[a]];
    near = Math.max(near, Math.min(lo, hi));
    far = Math.min(far, Math.max(lo, hi));
  }
  return near <= far ? near : Infinity;
}
