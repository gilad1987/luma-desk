import { trussPoints } from './bounds';
import type { StageDesign } from './StageDesign';
import type { TrussParams } from './trussTypes';

/**
 * How far a truss body reaches below its highest enclosing point. The points of a tube truss run along its centre
 * line, so half its section hangs below them; the points of a roof are its box corners, so its full height does.
 */
function depthBelowTop(params: TrussParams): number {
  return params.kind === 'roof' ? params.size[1] : params.section / 2;
}

/**
 * The y of the underside of the highest truss of `d`: the PA hangs under it, so a design with low trusses does not
 * leave the PA in the air at the built-in grid height. The underside, not the centre line, so a thick truss never
 * touches the hang below it. Null when the design has no truss or hides its trusses scenery part: there is nothing
 * to hang from, and the PA stands on the deck.
 */
export function highestTrussY(d: Pick<StageDesign, 'trusses' | 'scenery'>): number | null {
  if (!d.scenery.trusses || d.trusses.length === 0) return null;
  let underside = -Infinity;
  for (const truss of d.trusses) {
    let top = -Infinity;
    for (const p of trussPoints(truss)) top = Math.max(top, p.y);
    underside = Math.max(underside, top - depthBelowTop(truss.params));
  }
  return underside;
}
