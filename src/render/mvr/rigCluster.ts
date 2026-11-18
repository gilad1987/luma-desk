import type { StageBounds, Vec3 } from '../../domain/stage/types';
import { linkedGroups } from './linkedGroups';

/** The stage of a file as the camera frames it, and how many fixtures stand far from it. */
export interface RigCluster {
  readonly box: StageBounds;
  /** Fixtures outside the stage group (follow spots at FOH, a delay tower, sign boards); none is removed anywhere. */
  readonly outliers: number;
}

/** Fixtures of one stage hang at most this many median neighbour distances apart in plan. */
const GAP_FACTOR = 6;
/** The smallest gap that splits two groups (m): trusses and wings of one stage are nearer, FOH and towers farther. */
const MIN_GAP = 15;
/** A group with at least this share of the largest group's fixtures is a stage of its own (a second stage). */
const KEEP_SHARE = 0.5;
/** Scenery that reaches the group grows its box, per side by at most this share of the group's size, or `GROW_M`. */
const GROW_SHARE = 0.25;
const GROW_M = 6;
/** Scenery this near the group in plan touches it (m). */
const TOUCH = 0.5;

const PLAN = [0, 2] as const;

const median = (values: readonly number[]): number =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;

/** The distance in plan from each point to its nearest other point. */
function nearest(points: readonly Vec3[]): number[] {
  return points.map((a, i) =>
    points.reduce((best, b, j) => (i === j ? best : Math.min(best, Math.hypot(a[0] - b[0], a[2] - b[2]))), Infinity),
  );
}

/** The box around `points`; a box of zeros without one. */
export function boxOf(points: readonly Vec3[]): StageBounds {
  const axis = (i: 0 | 1 | 2, pick: (...values: number[]) => number): number =>
    points.reduce((value, point) => pick(value, point[i]), points[0]?.[i] ?? 0);
  return {
    min: [axis(0, Math.min), axis(1, Math.min), axis(2, Math.min)],
    max: [axis(0, Math.max), axis(1, Math.max), axis(2, Math.max)],
  };
}

/**
 * `core` grown to the scenery that overlaps or touches it in plan: its trusses, deck, screens and wings. A ground
 * plane, a hall or a street touches every stage, so a part that reaches past a side by more than `GROW_SHARE` of the
 * group's size (at least `GROW_M`) is not part of the stage and grows nothing. Nothing grows past `limit`, and the
 * floor is the one of `limit`: fixtures hang, and the views need the ground they hang over.
 */
function grown(core: StageBounds, scenery: readonly StageBounds[], limit: StageBounds): StageBounds {
  const part = (s: StageBounds): boolean =>
    PLAN.every((a) => {
      const reach = Math.max(GROW_M, GROW_SHARE * (core.max[a] - core.min[a]));
      const touches = s.min[a] <= core.max[a] + TOUCH && s.max[a] >= core.min[a] - TOUCH;
      return touches && s.min[a] >= core.min[a] - reach && s.max[a] <= core.max[a] + reach;
    });
  const parts = scenery.filter(part);
  const lo = (a: 0 | 2): number =>
    parts.reduce((value, s) => Math.min(value, Math.max(s.min[a], limit.min[a])), core.min[a]);
  const hi = (a: 0 | 1 | 2): number =>
    parts.reduce((value, s) => Math.max(value, Math.min(s.max[a], limit.max[a])), core.max[a]);
  return { min: [lo(0), Math.min(core.min[1], limit.min[1]), lo(2)], max: [hi(0), hi(1), hi(2)] };
}

/**
 * The box of the stage of a file: its densest fixture group, grown to the scenery that touches it. A wide file (a
 * festival site, a street with sign boards) has fixtures far from its stage, and a box around all of them shrinks
 * the stage to a small part of the frame. Fixtures nearer than the gap (`GAP_FACTOR` median neighbour distances, at
 * least `MIN_GAP`) are one group (single linkage, in plan); the largest group is the stage, with every group of at
 * least `KEEP_SHARE` of its count, so two stages of one size are both kept. The result does not depend on the order
 * of the fixtures. Without a fixture, or when the group has no size in plan (one fixture that no scenery touches),
 * the box is `fallback`.
 */
export function rigCluster(
  fixtures: readonly Vec3[],
  scenery: readonly StageBounds[],
  fallback: StageBounds,
): RigCluster {
  const points = fixtures.filter((point) => point.every(Number.isFinite));
  if (points.length === 0) return { box: fallback, outliers: 0 };
  const gap = Math.max(MIN_GAP, GAP_FACTOR * median(nearest(points).filter(Number.isFinite)));
  const groups = linkedGroups(points, gap);
  const largest = Math.max(...groups.map((group) => group.length));
  const kept = groups.filter((group) => group.length >= KEEP_SHARE * largest).flat();
  const box = grown(boxOf(kept), scenery, fallback);
  const flat = PLAN.some((a) => box.max[a] - box.min[a] < 1);
  return { box: flat ? fallback : box, outliers: flat ? 0 : points.length - kept.length };
}
