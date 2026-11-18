import { trussPoints } from './bounds';
import type { StageDesign } from './StageDesign';
import type { StageTruss } from './trussTypes';

/**
 * The y of the underside of the highest truss of `d`: the PA hangs under it, so a design with low trusses does not
 * leave the PA in the air at the built-in grid height. The underside, not the centre line, so a thick truss never
 * touches the hang below it. Null when the design has no truss or hides its trusses scenery part: there is nothing
 * to hang from, and the PA stands on the deck.
 */
export function highestTrussY(d: Pick<StageDesign, 'trusses' | 'scenery'>): number | null {
  if (!d.scenery.trusses || d.trusses.length === 0) return null;
  return Math.max(...d.trusses.map(undersideOf));
}

/**
 * The y of one truss's underside. The points of a tube truss run along its centre line, so half its section hangs
 * below the highest of them. The points of a roof are its turned box corners, so the lowest of them is its underside:
 * a roof turned on its side hangs its width, not its height, below its centre.
 */
function undersideOf(truss: StageTruss): number {
  const ys = trussPoints(truss).map((p) => p.y);
  const { params } = truss;
  return params.kind === 'roof' ? Math.min(...ys) : Math.max(...ys) - params.section / 2;
}
