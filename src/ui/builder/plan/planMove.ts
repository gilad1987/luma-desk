import { moveFixtures } from '../../../domain/stage/edit/fixtureMoves';
import { moveTruss } from '../../../domain/stage/edit/trussOps';
import type { Vec3 } from '../../../domain/stage/types';
import type { EditOp } from '../EditorSession';
import type { BuilderSelection } from '../selection';
import type { Point2 } from './planTransform';

/** The grid step of a drag, in metres: the 0.5 m grid the plan view draws. */
export const SNAP_M = 0.5;
/** The grid step with Alt held, for fine placement. */
export const FINE_SNAP_M = 0.1;
/**
 * How far, in CSS px, the pointer moves from the press before a press becomes a drag. Without it a click with a 1 px
 * hand tremor snaps an off-grid item to the grid and adds an undo step the user never asked for.
 */
export const DRAG_THRESHOLD_PX = 4;

/**
 * The grid point nearest to `anchor + raw`: the absolute place where the grabbed item lands, with exact grid values.
 * Snapping the item, not the delta, lines an off-grid item up with the drawn grid. Rounding through the steps per
 * metre (2 or 10) gives the same number as the literal (0.3, not 3 * 0.1 = 0.30000000000000004).
 */
export function snappedTarget(anchor: Point2, raw: Point2, stepM: number): Point2 {
  const perMetre = Math.round(1 / stepM);
  const snap = (a: number, r: number): number => Math.round((a + r) * perMetre) / perMetre;
  return [snap(anchor[0], raw[0]), snap(anchor[1], raw[1])];
}

/** True once the pointer is `DRAG_THRESHOLD_PX` or more from the press point `from` (client px). */
export function pastDragThreshold(from: Point2, ev: Pick<PointerEvent, 'clientX' | 'clientY'>): boolean {
  return Math.hypot(ev.clientX - from[0], ev.clientY - from[1]) >= DRAG_THRESHOLD_PX;
}

/**
 * The edit op that moves the whole selection by `delta`. A truss carries its fixtures (`moveTruss`), so a picked
 * fixture on a picked truss is not moved twice; the loose fixtures move together through `moveFixtures`, pixel line
 * included, with one parse.
 */
export function moveSelection(sel: BuilderSelection, delta: Vec3): EditOp {
  return (d) => {
    const next = sel.trusses.reduce((design, id) => moveTruss(design, id, delta), d);
    const carried = new Set(sel.trusses);
    const isCarried = (trussId: string | null): boolean => trussId !== null && carried.has(trussId);
    const loose = next.fixtures.filter((f) => sel.fixtures.includes(f.id) && !isCarried(f.trussId));
    return moveFixtures(
      next,
      loose.map((f) => f.id),
      delta,
    );
  };
}
