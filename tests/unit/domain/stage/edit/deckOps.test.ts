/**
 * Owns the deck, LED wall, riser and venue ops: the deck keeps its downstage edge, the wall brings its screen
 * fixture, and a venue sets its scenery defaults. Drawing them is owned by the render tests.
 */
import { describe, expect, it } from 'vitest';
import {
  addRiser,
  removeRiser,
  setDeckSize,
  setSceneryPart,
  setVenue,
} from '../../../../../src/domain/stage/edit/deckOps.ts';
import { setLedWall } from '../../../../../src/domain/stage/edit/ledWall.ts';
import { sampleDesign } from './sampleDesign.ts';

describe('setDeckSize', () => {
  it('keeps the centre line and the downstage edge', () => {
    const d = setDeckSize(sampleDesign(), { width: 10, depth: 6, height: 1.5 });
    expect(d.deck).toEqual({ x0: -5, x1: 5, z0: -2, z1: 4, height: 1.5 });
    expect(() => setDeckSize(sampleDesign(), { width: 0, depth: 6, height: 1 })).toThrow(/0 x 6 x 1/);
  });

  it('moves the risers with a new deck height, so they keep standing on the deck', () => {
    const withRiser = addRiser(sampleDesign(), [1, 1.5, 0], [2, 0.5, 2]);
    const raised = setDeckSize(withRiser, { width: 12, depth: 8, height: 1.75 });
    expect(raised.risers[0]?.at).toEqual([1, 2.25, 0]);
    expect(setDeckSize(raised, { width: 10, depth: 8, height: 1.75 }).risers).toBe(raised.risers);
  });
});

describe('setLedWall', () => {
  it('adds a wall on the upstage edge with its screen fixture', () => {
    const d = setLedWall(sampleDesign(), { width: 8, height: 4 });
    expect([d.screens, d.fixtures[4]]).toEqual([
      [{ id: 'led-wall', fixtureId: 401, x0: -4, x1: 4, y0: 1, y1: 5, z: -4 }],
      { id: 401, type: 'screen', role: 'screen', trussId: null, position: [0, 3, -4], mount: 'wall' },
    ]);
  });

  it('resizes the wall and moves its fixture to the new centre', () => {
    const d = setLedWall(setLedWall(sampleDesign(), { width: 8, height: 4 }), { width: 6, height: 2 });
    expect([d.screens[0], d.fixtures[4]?.position]).toEqual([
      { id: 'led-wall', fixtureId: 401, x0: -3, x1: 3, y0: 1, y1: 3, z: -4 },
      [0, 2, -4],
    ]);
  });

  it('shows the LED wall scenery part when it turns the wall on', () => {
    const hidden = { ...sampleDesign(), scenery: { ...sampleDesign().scenery, ledWall: false } };
    expect(setLedWall(hidden, { width: 8, height: 4 }).scenery.ledWall).toBe(true);
  });

  it('turns the wall off together with its fixture', () => {
    const d = setLedWall(setLedWall(sampleDesign(), { width: 8, height: 4 }), null);
    expect([d.screens, d.fixtures]).toEqual([[], sampleDesign().fixtures]);
  });
});

describe('risers', () => {
  it('adds risers with unique ids and removes one by id', () => {
    const two = addRiser(addRiser(sampleDesign(), [0, 1.4, 0], [2, 0.4, 2]), [3, 1.4, 0], [2, 0.4, 2]);
    expect(removeRiser(two, 'riser-1').risers).toEqual([{ id: 'riser-2', at: [3, 1.4, 0], size: [2, 0.4, 2] }]);
  });
});

describe('venue and scenery', () => {
  it('writes the scenery defaults of each venue and keeps gridY', () => {
    const allOn = { deck: true, trusses: true, band: true, ledWall: true, crowd: true };
    const kinds = ['sultans-pool', 'black-box', 'open-field'] as const;
    expect(kinds.map((kind) => setVenue(sampleDesign(), kind)).map((d) => [d.venue, d.scenery])).toEqual([
      [{ kind: 'sultans-pool', gridY: 9 }, allOn],
      [
        { kind: 'black-box', gridY: 9 },
        { ...allOn, crowd: false },
      ],
      [{ kind: 'open-field', gridY: 9 }, allOn],
    ]);
  });

  it('shows or hides one part only', () => {
    expect(setSceneryPart(sampleDesign(), 'band', false).scenery).toEqual({
      ...sampleDesign().scenery,
      band: false,
    });
  });
});
