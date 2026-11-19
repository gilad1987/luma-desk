/**
 * Edges of a deck height change (`setDeckSize`) that deckHeight.test.ts does not reach: a hidden LED wall, a lower
 * deck, a second screen, the built-in side screens (they stand off the deck, so they stay), float noise in the rise,
 * and the lists kept as they are when nothing rises.
 */
import { describe, expect, it } from 'vitest';
import { setDeckSize, setSceneryPart } from '../../../../../src/domain/stage/edit/deckOps.ts';
import { setLedWall } from '../../../../../src/domain/stage/edit/ledWall.ts';
import { millimetres } from '../../../../../src/domain/stage/edit/millimetres.ts';
import { createTemplate } from '../../../../../src/domain/stage/templates/index.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { frameOf } from '../../../../../src/domain/stage/StageFrame.ts';
import { sampleDesign } from './sampleDesign.ts';

const WALL = { width: 8, height: 4 };
const deckAt = (height: number) => ({ width: 12, depth: 8, height });
const walled = (): StageDesign => setLedWall(sampleDesign(), WALL);
const wallFixtureY = (d: StageDesign): number | undefined =>
  d.fixtures.find((f) => f.id === d.screens[0]?.fixtureId)?.position[1];

describe('setDeckSize edges for the LED wall', () => {
  it('moves a hidden wall too, so showing it again finds it on the deck', () => {
    const hidden = setSceneryPart(walled(), 'ledWall', false);
    const lower = setDeckSize(hidden, deckAt(0.4));
    expect(lower.screens[0]).toMatchObject({ y0: 0.4, y1: 4.4 });
    expect(wallFixtureY(lower)).toBe(2.4);
    expect(frameOf(lower).screen).toBeNull();
    const shown = setLedWall(lower, WALL);
    expect([shown.scenery.ledWall, shown.screens[0]?.y0]).toEqual([true, 0.4]);
  });

  it('moves only the first screen; a second screen and its fixture stay', () => {
    const base = walled();
    const extra = { id: 'extra', fixtureId: 101, x0: 7, x1: 9, y0: 2, y1: 3, z: 0 };
    const d = setDeckSize({ ...base, screens: [...base.screens, extra] }, deckAt(2));
    expect(d.screens[0]).toMatchObject({ y0: 2, y1: 6 });
    expect(d.screens[1]).toBe(extra);
    expect(d.fixtures.find((f) => f.id === 101)).toBe(base.fixtures.find((f) => f.id === 101));
  });

  it('stores the wall heights rounded to 1 mm when the rise carries float noise', () => {
    // 1.1 - 1 is 0.10000000000000009
    const d = setDeckSize(walled(), deckAt(1.1));
    expect(d.screens[0]).toMatchObject({ y0: 1.1, y1: 5.1 });
    expect(wallFixtureY(d)).toBe(3.1);
  });

  it('brings the wall back where it was after a raise and the same lower', () => {
    const base = walled();
    const back = setDeckSize(setDeckSize(base, deckAt(1.7)), deckAt(1));
    expect([back.screens, back.fixtures]).toEqual([base.screens, base.fixtures]);
  });

  it('keeps the same screen and fixture lists when the height does not change', () => {
    const base = walled();
    const wider = setDeckSize(base, { width: 20, depth: 8, height: 1 });
    expect([wider.screens === base.screens, wider.fixtures === base.fixtures]).toEqual([true, true]);
  });

  it('keeps the built-in side screens where they stand, off the deck, and moves the wall', () => {
    const pool = createTemplate('sultans-pool');
    const { x0, x1, z0, z1, height } = pool.deck;
    const raised = setDeckSize(pool, { width: x1 - x0, depth: z1 - z0, height: height + 0.5 });
    expect(raised.screens[0]?.sides).toBe(pool.screens[0]?.sides);
    expect(raised.screens[0]?.y0).toBe(millimetres((pool.screens[0]?.y0 ?? NaN) + 0.5));
  });

  it('keeps the same lists for a design without a wall', () => {
    const d = sampleDesign();
    const raised = setDeckSize(d, deckAt(2));
    expect([raised.screens === d.screens, raised.fixtures === d.fixtures]).toEqual([true, true]);
  });
});
