/**
 * Owns `frameOf` and the deck fit behind its band points: the default frame must equal the venue.ts constants
 * exactly, a design without a screen, ring or band (or with the LED wall hidden) must give null or empty targets, and
 * another deck size must move
 * the band marks with it.
 */
import { describe, expect, it } from 'vitest';
import { IDENTITY_FIT } from '../../../../src/domain/stage/deckFit.ts';
import { frameOf } from '../../../../src/domain/stage/StageFrame.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import { BAND_PTS, DECK, RING, SCREEN, STAGE } from '../../../../src/domain/venue.ts';

const VENUE_DESIGN = createTemplate('sultans-pool');

describe('frameOf', () => {
  it('equals STAGE, DECK, SCREEN, RING and BAND_PTS for the built-in stage', () => {
    const frame = frameOf(VENUE_DESIGN);
    expect(frame.deck).toEqual({ ...STAGE, height: DECK });
    expect(frame.screen).toEqual(SCREEN);
    expect(frame.ring).toEqual({ x: RING.x, y: RING.y, z: RING.z, R: RING.R });
    expect(frame.bandPoints).toBe(BAND_PTS);
    expect(frame.venue).toBe('sultans-pool');
  });

  it('gives null targets and no band marks for a bare deck with the band off', () => {
    const bare = { ...VENUE_DESIGN, screens: [], trusses: [], scenery: { ...VENUE_DESIGN.scenery, band: false } };
    expect(frameOf(bare)).toEqual({
      deck: VENUE_DESIGN.deck,
      screen: null,
      ring: null,
      bandPoints: [],
      venue: 'sultans-pool',
      fit: IDENTITY_FIT,
    });
  });

  it('gives no screen target when the LED wall scenery is hidden', () => {
    const hidden = { ...VENUE_DESIGN, scenery: { ...VENUE_DESIGN.scenery, ledWall: false } };
    expect(hidden.screens.length).toBeGreaterThan(0);
    expect(frameOf(hidden).screen).toBeNull();
  });

  it('takes the ring from the first circle truss, after other kinds', () => {
    const trusses = VENUE_DESIGN.trusses.filter((t) => t.id !== 'ring-outer');
    expect(trusses[0]?.params.kind).not.toBe('circle');
    const ring = frameOf({ ...VENUE_DESIGN, trusses }).ring;
    expect(ring).toEqual({ x: RING.x, y: RING.y2, z: RING.z, R: RING.r2 });
  });

  it('moves the band marks onto a half-size deck and keeps the lift', () => {
    const deck = { x0: -11.5, x1: 11.5, z0: -10.2, z1: 0.6, height: 1 };
    const points = frameOf({ ...VENUE_DESIGN, deck }).bandPoints;
    expect(points).toHaveLength(BAND_PTS.length);
    points.forEach(([x, z, lift], i) => {
      const [x0, z0, lift0] = BAND_PTS[i] ?? [NaN, NaN, NaN];
      expect(x).toBeCloseTo(x0 / 2, 12);
      expect(z).toBeCloseTo(0.6 + (z0 - 0.6) / 2, 12);
      expect(lift).toBe(lift0);
    });
  });

  it('moves the band marks across with an off-centre deck', () => {
    const deck = { ...VENUE_DESIGN.deck, x0: -13, x1: 33 };
    const [x] = frameOf({ ...VENUE_DESIGN, deck }).bandPoints[1] ?? [NaN];
    expect(x).toBeCloseTo((BAND_PTS[1]?.[0] ?? NaN) + 10, 12);
  });
});
