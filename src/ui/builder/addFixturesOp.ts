import type { FixtureTypeId } from '../../domain/FixtureType';
import { addFixturesOnTruss, addFloorRow } from '../../domain/stage/edit/addFixtures';
import { setFixtureProps } from '../../domain/stage/edit/itemOps';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { FixtureRole } from '../../domain/stage/types';
import type { EditOp } from './EditorSession';

/** What the "Add N fixtures" button adds. */
export interface AddRequest {
  readonly type: FixtureTypeId;
  readonly count: number;
  /** The truss to hang on; null puts a floor row along the front of the deck. */
  readonly trussId: string | null;
  /** The role of every new fixture; null keeps the one `defaultRole` gives. */
  readonly role: FixtureRole | null;
}

/** A floor row stays this far inside the deck edges, so the fixtures stand on the deck. */
const FLOOR_INSET_M = 0.5;

/**
 * The Add button as one edit: the fixtures, then their role, so one Undo takes the whole step back. The domain ops
 * check the count and the truss and throw `RangeError`, which the session turns into the text the tab shows.
 */
export function addFixturesOp(request: AddRequest): EditOp {
  return (d) => {
    const added = addTo(d, request);
    return request.role === null ? added : withRole(d, added, request.role);
  };
}

function addTo(d: StageDesign, { type, count, trussId }: AddRequest): StageDesign {
  if (trussId !== null) return addFixturesOnTruss(d, { trussId, type, count });
  const { x0, x1, z1, height } = d.deck;
  const z = z1 - FLOOR_INSET_M;
  return addFloorRow(d, { type, count, from: [x0 + FLOOR_INSET_M, height, z], to: [x1 - FLOOR_INSET_M, height, z] });
}

function withRole(before: StageDesign, after: StageDesign, role: FixtureRole): StageDesign {
  const oldIds = new Set(before.fixtures.map((f) => f.id));
  const added = after.fixtures.filter((f) => !oldIds.has(f.id));
  return added.reduce((d, f) => setFixtureProps(d, f.id, { role }), after);
}
