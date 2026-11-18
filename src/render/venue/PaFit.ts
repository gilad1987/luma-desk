import type { DeckFit } from '../../domain/stage/deckFit';
import { DECK, STAGE } from '../../domain/venue';
import type { PaHang } from './PaHangs';

/** The air between the top of a hang and the truss it hangs under. */
const TRUSS_GAP = 0.3;
/** How far a standing hang's centre sits in from the deck's side and downstage edges: half a turned box and a little. */
const EDGE_INSET = 1;
/** The z step between the two standing hangs of a side, the same step as in the built-in layout. */
const ROW_STEP = 1.6;

/**
 * Moves one PA hang for the fitted deck and the design's highest truss y (`trussTop`, null when there is no truss).
 * Under a truss the hang keeps its fitted plan place and its top stays below the truss, but never rises over its
 * built height: the built-in roof is far above the PA, so the boot stage keeps its exact numbers. The plan math is
 * inline instead of `onDeck`, so a rebuild allocates nothing; the built x and z are never -0, so x * 1 + 0 is exact.
 */
export function placePaHang(h: PaHang, fit: DeckFit, trussTop: number | null): void {
  if (trussTop === null) standOnDeck(h, fit);
  else {
    const y = Math.min(h.y, trussTop - TRUSS_GAP - h.top);
    h.group.position.set(h.x * fit.scaleX + fit.offsetX, y, h.z * fit.scaleZ + fit.offsetZ);
  }
}

/**
 * With no truss there is nothing to hang from, so the hang stands on the deck: its lowest box at deck height, its
 * centre just inside the deck's side edge, the outer hang near the downstage edge and the inner one a row upstage.
 */
function standOnDeck(h: PaHang, fit: DeckFit): void {
  const edge = (h.side < 0 ? STAGE.x0 : STAGE.x1) * fit.scaleX + fit.offsetX;
  const front = STAGE.z1 * fit.scaleZ + fit.offsetZ;
  h.group.position.set(edge - h.side * EDGE_INSET, DECK + fit.lift - h.bottom, front - EDGE_INSET - h.row * ROW_STEP);
}
