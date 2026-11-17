/**
 * Owns `surfacesOf` (G6): for the built-in stage the deck top and the LED wall front must carry the numbers the old
 * hard-coded hit test used, risers must add their own top boxes between the two, and a hidden deck or LED wall must
 * give no boxes.
 */
import { describe, expect, it } from 'vitest';
import { surfacesOf } from '../../../../src/domain/stage/surfaces.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import { DECK, SCREEN, STAGE } from '../../../../src/domain/venue.ts';

const design = createTemplate('sultans-pool');
const risers = [{ id: 'r1', at: [2, 2.5, -5], size: [4, 0.5, 2] }] as const;
const riserTop = { min: [0, 2, -6], max: [4, 2.5, -4], face: 'top' };
const deckTop = { min: [STAGE.x0, 0, STAGE.z0], max: [STAGE.x1, DECK, STAGE.z1], face: 'top' };
const screenFront = {
  min: [SCREEN.x0 - 5, DECK, SCREEN.z],
  max: [SCREEN.x1 + 5, 27, SCREEN.z + 0.05],
  face: 'front',
};

describe('surfacesOf', () => {
  it('gives exactly the deck top and the LED wall front for the built-in stage', () => {
    expect(surfacesOf(design)).toEqual([deckTop, screenFront]);
  });

  it('adds one top box per riser, after the deck and before the screens', () => {
    expect(surfacesOf({ ...design, risers })).toEqual([deckTop, riserTop, screenFront]);
  });

  it('gives only the deck top when the design has no LED wall', () => {
    expect(surfacesOf({ ...design, screens: [] })).toEqual([deckTop]);
  });

  it('drops the deck top and the riser tops when the deck scenery is off', () => {
    const scenery = { ...design.scenery, deck: false };
    expect(surfacesOf({ ...design, risers, scenery })).toEqual([screenFront]);
  });

  it('drops the LED wall fronts when the LED wall scenery is off', () => {
    const scenery = { ...design.scenery, ledWall: false };
    expect(surfacesOf({ ...design, risers, scenery })).toEqual([deckTop, riserTop]);
  });
});
