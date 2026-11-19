/**
 * Owns what a deck height change (`setDeckSize`) moves in the same step: the risers and the LED wall stand on the deck,
 * so they rise or sink with it, stored rounded to 1 mm as a riser move stores them; the side screens stand off it.
 */
import { describe, expect, it } from 'vitest';
import { addRiser, setDeckSize } from '../../../../../src/domain/stage/edit/deckOps.ts';
import { setLedWall } from '../../../../../src/domain/stage/edit/ledWall.ts';
import { sampleDesign } from './sampleDesign.ts';

const DECK_13 = { width: 12, depth: 8, height: 1.3 };

describe('setDeckSize with a new height', () => {
  it('moves the risers, so they keep standing on the deck', () => {
    const withRiser = addRiser(sampleDesign(), [1, 1.5, 0], [2, 0.5, 2]);
    const raised = setDeckSize(withRiser, { width: 12, depth: 8, height: 1.75 });
    expect(raised.risers[0]?.at).toEqual([1, 2.25, 0]);
    expect(setDeckSize(raised, { width: 10, depth: 8, height: 1.75 }).risers).toBe(raised.risers);
  });

  it('stores the moved riser height rounded to 1 mm, as a riser move does', () => {
    const withRiser = addRiser(sampleDesign(), [1, 1.1, 0], [2, 0.1, 2]);
    // without the rounding 1.1 + (1.3 - 1) gives 1.4000000000000001
    expect(setDeckSize(withRiser, DECK_13).risers[0]?.at[1]).toBe(1.4);
  });

  it('rounds only the height, so a sub-millimetre x or z stays as stored', () => {
    const withRiser = addRiser(sampleDesign(), [1.0004, 1.1, -0.0003], [2, 0.1, 2]);
    expect(setDeckSize(withRiser, DECK_13).risers[0]?.at).toEqual([1.0004, 1.4, -0.0003]);
  });

  it('moves the LED wall and its screen fixture, but not its side screens, which stand off the deck', () => {
    const walled = setLedWall(sampleDesign(), { width: 8, height: 4 });
    const side = { at: [33.5, 15, 4], yaw: 0.3, width: 12, height: 6.75 } as const;
    const d = setDeckSize({ ...walled, screens: walled.screens.map((s) => ({ ...s, sides: [side] })) }, DECK_13);
    const wall = { id: 'led-wall', fixtureId: 401, x0: -4, x1: 4, y0: 1.3, y1: 5.3, z: -4 };
    expect(d.screens).toEqual([{ ...wall, sides: [side] }]);
    expect(d.fixtures[4]?.position).toEqual([0, 3.3, -4]);
    expect(d.fixtures.slice(0, 4)).toEqual(walled.fixtures.slice(0, 4));
  });

  it('keeps the wall and its fixture when only the width changes', () => {
    const walled = setLedWall(sampleDesign(), { width: 8, height: 4 });
    const wider = setDeckSize(walled, { width: 20, depth: 8, height: walled.deck.height });
    expect([wider.screens, wider.fixtures]).toEqual([walled.screens, walled.fixtures]);
  });
});
