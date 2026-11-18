/**
 * Owns the edges of the stage data reads beyond the built-in stage: `frameOf` on decks of other sizes (the fit must
 * be applied, finite and keep marks on the deck), `surfacesOf` with a lower deck and several risers, and `boundsOf`
 * on an empty design and a stood-up circle truss. Built-in parity of each function lives in its own test file.
 */
import { describe, expect, it } from 'vitest';
import { boundsOf } from '../../../../src/domain/stage/bounds.ts';
import { deckFitOf, isIdentityFit } from '../../../../src/domain/stage/deckFit.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { frameOf } from '../../../../src/domain/stage/StageFrame.ts';
import { surfacesOf } from '../../../../src/domain/stage/surfaces.ts';
import { BAND_PTS } from '../../../../src/domain/venue.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';

const SULTANS_POOL = createTemplate('sultans-pool');
const theatreDeck = { x0: -5, x1: 5, z0: -7, z1: 1, height: 1 };
const festivalDeck = { x0: -15, x1: 15, z0: -14, z1: 2, height: 2.2 };
const empty: StageDesign = { ...SULTANS_POOL, deck: theatreDeck, screens: [], risers: [], trusses: [], fixtures: [] };

describe('frameOf on other decks', () => {
  it('fits every band mark inside a theatre and a festival deck, with finite numbers', () => {
    for (const deck of [theatreDeck, festivalDeck]) {
      const points = frameOf({ ...SULTANS_POOL, deck }).bandPoints;
      expect(isIdentityFit(deckFitOf(deck))).toBe(false);
      expect(points).toHaveLength(BAND_PTS.length);
      for (const [x, z] of points) {
        expect([Number.isFinite(x), Number.isFinite(z)]).toEqual([true, true]);
        expect([x >= deck.x0, x <= deck.x1, z >= deck.z0, z <= deck.z1]).toEqual([true, true, true, true]);
      }
    }
  });

  it('gives no band marks on another deck when the band is off', () => {
    const scenery = { ...SULTANS_POOL.scenery, band: false };
    expect(frameOf({ ...SULTANS_POOL, deck: festivalDeck, scenery }).bandPoints).toEqual([]);
  });

  it('takes only the edges of the first screen, without its side screens', () => {
    const sides = [{ at: [-12, 5, 0], yaw: 0.3, width: 4, height: 2 }] as const;
    const first = { id: 'a', fixtureId: 1, x0: -4, x1: 4, y0: 1, y1: 5, z: -6, sides };
    const second = { id: 'b', fixtureId: 2, x0: -9, x1: 9, y0: 2, y1: 9, z: -12 };
    const frame = frameOf({ ...empty, screens: [first, second] });
    expect(frame.screen).toStrictEqual({ z: -6, x0: -4, x1: 4, y0: 1, y1: 5 });
  });

  it('has no ring when the trusses are all straight', () => {
    const pipe = {
      id: 'p1',
      name: 'Pipe 1',
      role: 'mid',
      transform: { position: [0, 6, -2] },
      params: { kind: 'straight', a: [-5, 0, 0], b: [5, 0, 0], section: 0.3 },
    } as const;
    expect(frameOf({ ...empty, trusses: [pipe] }).ring).toBeNull();
  });
});

describe('surfacesOf and boundsOf edges', () => {
  it('starts the LED wall front at the height of a lower deck and keeps riser order', () => {
    const screen = { id: 'w', fixtureId: 9, x0: -3, x1: 3, y0: 1.5, y1: 4, z: -6.5 };
    const risers = [
      { id: 'drums', at: [0, 1.6, -5], size: [3, 0.6, 2] },
      { id: 'keys', at: [3, 1.5, -4], size: [2, 0.5, 2] },
    ] as const;
    expect(surfacesOf({ ...empty, screens: [screen], risers })).toEqual([
      { min: [-5, 0, -7], max: [5, 1, 1], face: 'top' },
      { min: [-1.5, 1, -6], max: [1.5, 1.6, -4], face: 'top' },
      { min: [2, 1, -5], max: [4, 1.5, -3], face: 'top' },
      { min: [-8, 1, -6.5], max: [8, 27, -6.45], face: 'front' },
    ]);
  });

  it('is exactly the deck box for an empty design', () => {
    expect(boundsOf(empty)).toStrictEqual({ min: [-5, 0, -7], max: [5, 1, 1] });
  });

  it('stands a circle truss up when it is turned a quarter about X', () => {
    const ring = {
      id: 'ring',
      name: 'Ring',
      role: 'ring',
      transform: { position: [0, 8, -3], rotation: [Math.SQRT1_2, 0, 0, Math.SQRT1_2] },
      params: { kind: 'circle', radius: 4, section: 0.4 },
    } as const;
    const { min, max } = boundsOf({ ...empty, trusses: [ring] });
    [...min, ...max].forEach((v, i) => expect(v).toBeCloseTo([-5, 0, -7, 5, 12, 1][i] ?? NaN, 12));
  });
});
