import { trussPoints } from '../../../domain/stage/bounds';
import type { StageTruss } from '../../../domain/stage/trussTypes';
import type { Point2 } from './planTransform';

/**
 * What a truss looks like from above, in world metres. A circle is a ring; every other kind is the outline around its
 * enclosing points (`trussPoints`), so the view and the camera fit judge a truss by the same extents: a straight
 * truss is a line, a goalpost the line between its posts, a roof a rectangle and a tower one point.
 */
export type TrussFootprint =
  | { readonly kind: 'ring'; readonly centre: Point2; readonly radius: number }
  | { readonly kind: 'outline'; readonly points: readonly Point2[] };

/** Points closer than this (metres) are one point, so a tower or a goalpost does not draw zero-length edges. */
const SAME_POINT_M = 1e-6;

/**
 * The footprints per truss object. The view draws every truss on every drag frame and the hull allocates; a truss is
 * never changed in place (a move makes a new truss object), so a kept footprint never goes stale.
 */
const footprints = new WeakMap<StageTruss, TrussFootprint>();

/** The plan footprint of `t`; see `TrussFootprint`. Made once per truss object. */
export function trussFootprint(t: StageTruss): TrussFootprint {
  let fp = footprints.get(t);
  if (!fp) {
    fp = footprintOf(t);
    footprints.set(t, fp);
  }
  return fp;
}

function footprintOf(t: StageTruss): TrussFootprint {
  if (t.params.kind === 'circle') {
    const [x, , z] = t.transform.position;
    return { kind: 'ring', centre: [x, z], radius: t.params.radius };
  }
  return { kind: 'outline', points: hull(trussPoints(t).map((p): Point2 => [p.x, p.z])) };
}

/** The convex hull of `points` (monotone chain), without repeated points; one or two points come back as they are. */
function hull(points: readonly Point2[]): Point2[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]).filter(isNewPoint);
  if (sorted.length < 3) return sorted;
  const lower = halfHull(sorted);
  const upper = halfHull([...sorted].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function isNewPoint(p: Point2, i: number, sorted: readonly Point2[]): boolean {
  const before = sorted[i - 1];
  return !before || Math.hypot(p[0] - before[0], p[1] - before[1]) > SAME_POINT_M;
}

function halfHull(sorted: readonly Point2[]): Point2[] {
  const out: Point2[] = [];
  for (const p of sorted) {
    while (out.length >= 2 && !turnsLeft(out, p)) out.pop();
    out.push(p);
  }
  return out;
}

/** True when the last two points of `out` and `p` turn counter-clockwise, so the middle point stays on the hull. */
function turnsLeft(out: readonly Point2[], p: Point2): boolean {
  const a = out.at(-2),
    b = out.at(-1);
  if (!a || !b) return true;
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) > 0;
}
