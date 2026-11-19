import { BAND_PTS } from '../venue';
import { deckFitOf, isIdentityFit, onDeck, type DeckFit } from './deckFit';
import type { StageDeck, StageDesign, StageScreen } from './StageDesign';
import type { StageBounds, VenueKind } from './types';

/** A band member mark as [x, z, extra height above the deck]; the same shape as `BAND_PTS`. */
export type BandPoint = (typeof BAND_PTS)[number];

/**
 * The stage numbers that position presets and Auto Show aim at (the focus targets of contract §2), read from a design
 * instead of the fixed venue constants. For the built-in stage every field equals `STAGE`/`DECK`, `SCREEN`, `RING`
 * and `BAND_PTS`; a part the design lacks is null or empty, so presets can hide their missing targets (G10).
 */
export interface StageFrame {
  readonly deck: StageDeck;
  /** The first screen; null when the design has none or the `ledWall` scenery part hides it. */
  readonly screen: Pick<StageScreen, 'z' | 'x0' | 'x1' | 'y0' | 'y1'> | null;
  /** The first circle truss: its centre and radius `R`. */
  readonly ring: { readonly x: number; readonly y: number; readonly z: number; readonly R: number } | null;
  /** Empty when the band scenery is off, because then no performer stands on the deck. */
  readonly bandPoints: readonly BandPoint[];
  readonly venue: VenueKind;
  /** How the built-in deck maps onto this deck; position presets move their venue-fixed deck targets with it. */
  readonly fit: DeckFit;
  /** The box around the drawn seats of an imported file (`MvrDesignInfo.seatArea`); absent on every other stage. */
  readonly seats?: StageBounds;
}

/** The focus targets of a design; see `StageFrame`. */
export function frameOf(d: StageDesign): StageFrame {
  const fit = deckFitOf(d.deck);
  return {
    deck: d.deck,
    screen: screenOf(d),
    ring: ringOf(d),
    bandPoints: bandPointsOf(d, fit),
    venue: d.venue.kind,
    fit,
    ...(d.mvr?.seatArea ? { seats: d.mvr.seatArea } : {}),
  };
}

/** Null when the `ledWall` scenery part is off: a hidden wall is no focus target, as band marks follow `band`. */
function screenOf(d: StageDesign): StageFrame['screen'] {
  const s = d.scenery.ledWall ? d.screens.at(0) : undefined;
  return s ? { z: s.z, x0: s.x0, x1: s.x1, y0: s.y0, y1: s.y1 } : null;
}

function ringOf(d: StageDesign): StageFrame['ring'] {
  for (const t of d.trusses) {
    if (t.params.kind !== 'circle') continue;
    const [x, y, z] = t.transform.position;
    return { x, y, z, R: t.params.radius };
  }
  return null;
}

/** `BAND_PTS` itself on the built-in deck, so the default frame holds the venue constant (parity). */
function bandPointsOf(d: StageDesign, fit: DeckFit): readonly BandPoint[] {
  if (!d.scenery.band) return [];
  if (isIdentityFit(fit)) return BAND_PTS;
  return BAND_PTS.map(([x, z, lift]) => [...onDeck(fit, x, z), lift] as const);
}
