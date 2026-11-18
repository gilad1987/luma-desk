import type { StageDesign, StageFixture } from '../../domain/stage/StageDesign';
import type { StageTruss } from '../../domain/stage/trussTypes';
import { NO_SELECTION, type BuilderSelection } from './selection';
import { trussFootprint, type TrussFootprint } from './topViewShapes';
import type { Point2, TopTransform } from './topViewTransform';

/** The item under the pointer; `anchor` is its world x/z, which a drag snaps to the grid. */
export type TopPick =
  | { readonly kind: 'fixture'; readonly id: number; readonly anchor: Point2 }
  | { readonly kind: 'truss'; readonly id: string; readonly anchor: Point2 };

/** Half of the 44 px touch target (U9): a tap this far from an item still picks it. */
const PICK_RADIUS_PX = 22;
/** A tap within one mark width (the drawn mark is 6 px square) of a fixture's centre is on it, so the fixture wins. */
const FIXTURE_MARK_PX = 6;
/** A tap this close to a tower is on the ring around its fixtures' marks, so the tower wins over a truss line. */
const TOWER_MARK_PX = 12;

/**
 * The item under canvas point `at`, in this order: a fixture whose mark is under the pointer, a tower (a one-point
 * truss) near it, the nearest truss line within the pick radius, then the nearest fixture within it. Fixtures hang
 * close together on the truss lines and towers stand on them, so a fixture that won at the full radius hid nearly
 * every truss on a dense rig; a fixture off the trusses still gets the full touch target.
 */
export function pickAt(d: StageDesign, view: TopTransform, at: Point2): TopPick | null {
  const fixtureDistance = (f: StageFixture): number => distance(view.toCanvas(f.position[0], f.position[2]), at);
  const onMark = nearest(d.fixtures, fixtureDistance, FIXTURE_MARK_PX);
  if (onMark) return fixturePick(onMark);
  const trussDistance = (t: StageTruss): number => footprintDistance(trussFootprint(t), view, at);
  const towerDistance = (t: StageTruss): number => (isTower(t) ? trussDistance(t) : Infinity);
  const truss = nearest(d.trusses, towerDistance, TOWER_MARK_PX) ?? nearest(d.trusses, trussDistance, PICK_RADIUS_PX);
  if (truss) return { kind: 'truss', id: truss.id, anchor: [truss.transform.position[0], truss.transform.position[2]] };
  const fixture = nearest(d.fixtures, fixtureDistance, PICK_RADIUS_PX);
  return fixture ? fixturePick(fixture) : null;
}

function fixturePick(f: StageFixture): TopPick {
  return { kind: 'fixture', id: f.id, anchor: [f.position[0], f.position[2]] };
}

/** A truss drawn as one point from above: a tower, a post or a ladder. */
function isTower(t: StageTruss): boolean {
  const fp = trussFootprint(t);
  return fp.kind === 'outline' && fp.points.length === 1;
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

function nearest<T>(items: readonly T[], distanceOf: (item: T) => number, radius: number): T | null {
  let best: T | null = null,
    bestDistance = radius;
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
