import { trussPoints } from './bounds';
import type { StageDesign } from './StageDesign';

/**
 * The y of the highest point of any truss of `d`: the PA hangs under it, so a design with low trusses does not leave
 * the PA in the air at the built-in grid height. Null when the design has no truss or hides its trusses scenery part:
 * there is nothing to hang from, and the PA stands on the deck.
 */
export function highestTrussY(d: Pick<StageDesign, 'trusses' | 'scenery'>): number | null {
  if (!d.scenery.trusses || d.trusses.length === 0) return null;
  let top = -Infinity;
  for (const truss of d.trusses) for (const p of trussPoints(truss)) top = Math.max(top, p.y);
  return top;
}
