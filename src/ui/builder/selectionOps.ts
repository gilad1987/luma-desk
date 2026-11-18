import { deleteFixtures, deleteTruss, duplicateFixtures, duplicateTruss } from '../../domain/stage/edit/itemOps';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { BuilderSelection } from './selection';

/**
 * The Duplicate button as one edit: the picked fixtures, then each picked truss with its fixtures, so one Undo takes
 * the whole step back. An empty selection returns the draft itself (no undo step).
 */
export function duplicateSelection(sel: BuilderSelection): (d: StageDesign) => StageDesign {
  return (d) => sel.trusses.reduce(duplicateTruss, duplicateFixtures(d, sel.fixtures));
}

/** The Delete button as one edit: the picked fixtures, then each picked truss with its fixtures. */
export function deleteSelection(sel: BuilderSelection): (d: StageDesign) => StageDesign {
  return (d) => sel.trusses.reduce(deleteTruss, deleteFixtures(d, sel.fixtures));
}
