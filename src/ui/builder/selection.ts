import type { StageDesign } from '../../domain/stage/StageDesign';

/** What the user picked in the builder: fixture ids and truss ids, in pick order. */
export interface BuilderSelection {
  readonly fixtures: readonly number[];
  readonly trusses: readonly string[];
}

/** The empty selection. */
export const NO_SELECTION: BuilderSelection = { fixtures: [], trusses: [] };

/** True when nothing is picked, so Duplicate and Delete have nothing to act on. */
export function isEmptySelection(sel: BuilderSelection): boolean {
  return sel.fixtures.length === 0 && sel.trusses.length === 0;
}

/**
 * The part of `sel` that still exists in `d`. An undo or a delete can remove picked items; a stale id would make the
 * next Duplicate throw on a truss that is gone. An unchanged selection returns `sel` itself.
 */
export function keepExisting(sel: BuilderSelection, d: StageDesign): BuilderSelection {
  const fixtureIds = new Set(d.fixtures.map((f) => f.id));
  const trussIds = new Set(d.trusses.map((t) => t.id));
  const fixtures = sel.fixtures.filter((id) => fixtureIds.has(id));
  const trusses = sel.trusses.filter((id) => trussIds.has(id));
  if (fixtures.length === sel.fixtures.length && trusses.length === sel.trusses.length) return sel;
  return { fixtures, trusses };
}
