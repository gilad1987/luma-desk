/**
 * Owns `surfacesOf` (G6): for the built-in stage the deck top and the LED wall front must carry the numbers the old
 * hard-coded hit test used, and risers must add their own top boxes between the two.
 */
import { describe, expect, it } from 'vitest';
import { surfacesOf } from '../../../../src/domain/stage/surfaces.ts';
import { DECK, SCREEN, STAGE } from '../../../../src/domain/venue.ts';
import { VENUE_DESIGN } from './venueDesign.ts';

const deckTop = { min: [STAGE.x0, 0, STAGE.z0], max: [STAGE.x1, DECK, STAGE.z1], face: 'top' };
const screenFront = {
  min: [SCREEN.x0 - 5, DECK, SCREEN.z],
  max: [SCREEN.x1 + 5, 27, SCREEN.z + 0.05],
  face: 'front',
};

describe('surfacesOf', () => {
  it('gives exactly the deck top and the LED wall front for the built-in stage', () => {
    expect(surfacesOf(VENUE_DESIGN)).toEqual([deckTop, screenFront]);
  });

  it('adds one top box per riser, after the deck and before the screens', () => {
    const risers = [{ id: 'r1', at: [2, 2.5, -5], size: [4, 0.5, 2] }] as const;
    const boxes = surfacesOf({ ...VENUE_DESIGN, risers });
    expect(boxes).toEqual([deckTop, { min: [0, 2, -6], max: [4, 2.5, -4], face: 'top' }, screenFront]);
  });

  it('gives only the deck top when the design has no LED wall', () => {
    expect(surfacesOf({ ...VENUE_DESIGN, screens: [] })).toEqual([deckTop]);
  });
});
