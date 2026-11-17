import { DECK, STAGE } from '../venue';
import type { StageDeck } from './StageDesign';

/**
 * How to move the built-in band layout onto another deck: `x * scaleX + offsetX`, `z * scaleZ + offsetZ`, and
 * `y + lift`. The focus targets and the band props share it, so performers and their presets stay on the same deck.
 */
export interface DeckFit {
  readonly scaleX: number;
  readonly offsetX: number;
  readonly scaleZ: number;
  readonly offsetZ: number;
  readonly lift: number;
}

const BASE_WIDTH = STAGE.x1 - STAGE.x0;
const BASE_DEPTH = STAGE.z1 - STAGE.z0;
const BASE_CENTER_X = (STAGE.x0 + STAGE.x1) / 2;

/**
 * The fit from the built-in deck (`STAGE`, `DECK`) to `deck`: x scales by width about the deck centre, z scales by
 * depth from the downstage edge, and the lift is the height difference. The built-in deck gives the identity fit.
 */
export function deckFitOf(deck: StageDeck): DeckFit {
  const scaleX = (deck.x1 - deck.x0) / BASE_WIDTH;
  const scaleZ = (deck.z1 - deck.z0) / BASE_DEPTH;
  return {
    scaleX,
    offsetX: (deck.x0 + deck.x1) / 2 - BASE_CENTER_X * scaleX,
    scaleZ,
    offsetZ: deck.z1 - STAGE.z1 * scaleZ,
    lift: deck.height - DECK,
  };
}

/** Whether the fit moves nothing; callers then skip the pass, so the default stage does no extra float math. */
export function isIdentityFit(fit: DeckFit): boolean {
  return fit.scaleX === 1 && fit.offsetX === 0 && fit.scaleZ === 1 && fit.offsetZ === 0 && fit.lift === 0;
}
