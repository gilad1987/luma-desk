import type { StageDesign } from '../../domain/stage/StageDesign';
import { NO_SELECTION, type BuilderSelection } from './selection';
import { trussFootprint, type TrussFootprint } from './topViewShapes';
import type { Point2, TopTransform } from './topViewTransform';

/** The item under the pointer; `anchor` is its world x/z, which a drag snaps to the grid. */
export type TopPick =
  | { readonly kind: 'fixture'; readonly id: number; readonly anchor: Point2 }
  | { readonly kind: 'truss'; readonly id: string; readonly anchor: Point2 };

/** Half of the 44 px touch target (U9): a tap this far from an item still picks it. */
const PICK_RADIUS_PX = 22;

/**
 * The item nearest to canvas point `at`, within the pick radius. A fixture wins over a truss: fixtures hang on the
 * truss line, so the truss would otherwise tie with every fixture on it; a truss is picked between its fixtures.
 */
export function pickAt(d: StageDesign, view: TopTransform, at: Point2): TopPick | null {
  const fixture = nearest(d.fixtures, (f) => distance(view.toCanvas(f.position[0], f.position[2]), at));
  if (fixture) return { kind: 'fixture', id: fixture.id, anchor: [fixture.position[0], fixture.position[2]] };
  const truss = nearest(d.trusses, (t) => footprintDistance(trussFootprint(t), view, at));
  if (!truss) return null;
  const [x, , z] = truss.transform.position;
  return { kind: 'truss', id: truss.id, anchor: [x, z] };
}

/**
 * The selection after a click on `pick`. Shift adds to the selection; a plain click on a picked item keeps the
 * selection, so the whole group can be dragged; a plain click on empty floor clears it.
 */
export function selectionAfterPick(sel: BuilderSelection, pick: TopPick | null, isAdding: boolean): BuilderSelection {
  if (!pick) return isAdding ? sel : NO_SELECTION;
  if (pick.kind === 'fixture') {
    if (sel.fixtures.includes(pick.id)) return sel;
    return isAdding ? { ...sel, fixtures: [...sel.fixtures, pick.id] } : { fixtures: [pick.id], trusses: [] };
  }
  if (sel.trusses.includes(pick.id)) return sel;
  return isAdding ? { ...sel, trusses: [...sel.trusses, pick.id] } : { fixtures: [], trusses: [pick.id] };
}

function nearest<T>(items: readonly T[], distanceOf: (item: T) => number): T | null {
  let best: T | null = null,
    bestDistance = PICK_RADIUS_PX;
  for (const item of items) {
    const d = distanceOf(item);
    if (d > bestDistance) continue;
    best = item;
    bestDistance = d;
  }
  return best;
}

/** Pixel distance from `at` to the drawn line of a footprint: the ring, or the outline edges. */
function footprintDistance(fp: TrussFootprint, view: TopTransform, at: Point2): number {
  if (fp.kind === 'ring') return Math.abs(distance(view.toCanvas(...fp.centre), at) - fp.radius * view.scale);
  const points = fp.points.map(([x, z]) => view.toCanvas(x, z));
  return Math.min(...points.map((p, i) => segmentDistance(p, points[(i + 1) % points.length] ?? p, at)));
}

function segmentDistance(a: Point2, b: Point2, p: Point2): number {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.min(Math.max(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length2, 0), 1);
  return distance([a[0] + t * dx, a[1] + t * dy], p);
}

function distance(a: Point2, b: Point2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
