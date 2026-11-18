import { deleteFixtures, deleteTruss, duplicateFixtures, duplicateTruss } from '../../domain/stage/edit/itemOps';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { BuilderSelection } from './selection';

/**
 * The Duplicate button as one edit: the picked fixtures, then each picked truss with its fixtures, so one Undo takes
 * the whole step back. A picked truss copies its own fixtures (`duplicateTruss`), so a picked fixture on a picked
 * truss is left out of the fixture copy, as `moveSelection` leaves it out of the move; else it would be copied twice.
 * An empty selection returns the draft itself (no undo step).
 */
export function duplicateSelection(sel: BuilderSelection): (d: StageDesign) => StageDesign {
  return (d) => {
    const carried = new Set(sel.trusses);
    const isCarried = (trussId: string | null): boolean => trussId !== null && carried.has(trussId);
    const loose = d.fixtures.filter((f) => sel.fixtures.includes(f.id) && !isCarried(f.trussId)).map((f) => f.id);
    return sel.trusses.reduce(duplicateTruss, duplicateFixtures(d, loose));
  };
}

/** The Delete button as one edit: the picked fixtures, then each picked truss with its fixtures. */
export function deleteSelection(sel: BuilderSelection): (d: StageDesign) => StageDesign {
  return (d) => sel.trusses.reduce(deleteTruss, deleteFixtures(d, sel.fixtures));
}
