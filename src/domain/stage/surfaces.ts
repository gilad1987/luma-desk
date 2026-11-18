import type { StageDeck, StageDesign, StageRiser, StageScreen } from './StageDesign';
import type { SurfaceBox } from './types';

/** How far a beam spot may land past each side edge of an LED wall, as on the built-in screen. */
const SCREEN_SIDE_MARGIN = 5;
/** The top of the band where a beam can land on an LED wall front, as on the built-in screen. */
const SCREEN_HIT_TOP = 27;
/** The depth of the front box; its front face is the plane a beam lands on. */
const SCREEN_HIT_DEPTH = 0.05;

/**
 * The boxes that beams land on (G6): the deck top, each riser top and each LED wall front, in that order. The renderer
 * hit-tests them instead of the fixed venue numbers, so beams land on decks and risers of any size. A hidden scenery
 * part gives no boxes (the deck hides its risers too, the LED wall its fronts), so no beam spot floats on a part that
 * is not drawn.
 */
export function surfacesOf(d: StageDesign): SurfaceBox[] {
  const deckBoxes = d.scenery.deck ? [deckTop(d.deck), ...d.risers.map(riserTop)] : [];
  const screenBoxes = d.scenery.ledWall ? d.screens.map((s) => screenFront(s, d.deck.height)) : [];
  return [...deckBoxes, ...screenBoxes];
}

function deckTop(deck: StageDeck): SurfaceBox {
  return { min: [deck.x0, 0, deck.z0], max: [deck.x1, deck.height, deck.z1], face: 'top' };
}

function riserTop({ at: [x, y, z], size: [w, h, depth] }: StageRiser): SurfaceBox {
  return { min: [x - w / 2, y - h, z - depth / 2], max: [x + w / 2, y, z + depth / 2], face: 'top' };
}

function screenFront(s: StageScreen, deckHeight: number): SurfaceBox {
  return {
    min: [s.x0 - SCREEN_SIDE_MARGIN, deckHeight, s.z],
    max: [s.x1 + SCREEN_SIDE_MARGIN, SCREEN_HIT_TOP, s.z + SCREEN_HIT_DEPTH],
    face: 'front',
  };
}
