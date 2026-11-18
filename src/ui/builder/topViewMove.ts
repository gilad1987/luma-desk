import { setFixtureProps, type FixturePatch } from '../../domain/stage/edit/itemOps';
import { moveTruss, shiftFixture } from '../../domain/stage/edit/trussOps';
import type { StageFixture } from '../../domain/stage/StageDesign';
import type { Vec3 } from '../../domain/stage/types';
import type { EditOp } from './EditorSession';
import type { BuilderSelection } from './selection';
import type { Point2 } from './topViewTransform';

/** The grid step of a drag, in metres: the 0.5 m grid the top view draws. */
export const SNAP_M = 0.5;
/** The grid step with Alt held, for fine placement. */
export const FINE_SNAP_M = 0.1;

/**
 * The drag delta that puts `anchor` (the grabbed item) on the grid point nearest to `anchor + raw`. Snapping the item,
 * not the delta, lines an off-grid item up with the drawn grid. Height never changes in the top view. Rounding
 * through the steps per metre (2 or 10) keeps 0.1 m steps free of float noise (3 * 0.1 is not 0.3).
 */
export function snappedDelta(anchor: Point2, raw: Point2, stepM: number): Vec3 {
  const perMetre = Math.round(1 / stepM);
  const snap = (a: number, r: number): number => Math.round((a + r) * perMetre) / perMetre - a;
  return [snap(anchor[0], raw[0]), 0, snap(anchor[1], raw[1])];
}

/**
 * The edit op that moves the whole selection by `delta`. A truss carries its fixtures (`moveTruss`), so a picked
 * fixture on a picked truss is not moved twice; a loose fixture moves through `setFixtureProps`, pixel line included.
 */
export function moveSelection(sel: BuilderSelection, delta: Vec3): EditOp {
  return (d) => {
    let next = sel.trusses.reduce((design, id) => moveTruss(design, id, delta), d);
    const moved = new Set(sel.trusses);
    for (const id of sel.fixtures) {
      const fixture = next.fixtures.find((f) => f.id === id);
      if (!fixture || (fixture.trussId !== null && moved.has(fixture.trussId))) continue;
      next = setFixtureProps(next, id, shifted(fixture, delta));
    }
    return next;
  };
}

function shifted(f: StageFixture, delta: Vec3): FixturePatch {
  const moved = shiftFixture(f, delta);
  return moved.pixel ? { position: moved.position, pixel: moved.pixel } : { position: moved.position };
}
