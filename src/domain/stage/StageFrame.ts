import { BAND_PTS } from '../venue';
import { deckFitOf, isIdentityFit } from './deckFit';
import type { StageDeck, StageDesign, StageScreen } from './StageDesign';
import type { VenueKind } from './types';

/** A band member mark as [x, z, extra height above the deck]; the same shape as `BAND_PTS`. */
export type BandPoint = (typeof BAND_PTS)[number];

/**
 * The stage numbers that position presets and Auto Show aim at (the focus targets of contract §2), read from a design
 * instead of the fixed venue constants. For the built-in stage every field equals `STAGE`/`DECK`, `SCREEN`, `RING`
 * and `BAND_PTS`; a part the design lacks is null or empty, so presets can hide their missing targets (G10).
 */
export interface StageFrame {
  readonly deck: StageDeck;
  readonly screen: Pick<StageScreen, 'z' | 'x0' | 'x1' | 'y0' | 'y1'> | null;
  /** The first circle truss: its centre and radius `R`. */
  readonly ring: { readonly x: number; readonly y: number; readonly z: number; readonly R: number } | null;
  /** Empty when the band scenery is off, because then no performer stands on the deck. */
  readonly bandPoints: readonly BandPoint[];
  readonly venue: VenueKind;
}

/** The focus targets of a design; see `StageFrame`. */
export function frameOf(d: StageDesign): StageFrame {
  return { deck: d.deck, screen: screenOf(d), ring: ringOf(d), bandPoints: bandPointsOf(d), venue: d.venue.kind };
}

function screenOf(d: StageDesign): StageFrame['screen'] {
  const s = d.screens.at(0);
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

function bandPointsOf(d: StageDesign): readonly BandPoint[] {
  if (!d.scenery.band) return [];
  const fit = deckFitOf(d.deck);
  if (isIdentityFit(fit)) return BAND_PTS;
  return BAND_PTS.map(([x, z, lift]) => [x * fit.scaleX + fit.offsetX, z * fit.scaleZ + fit.offsetZ, lift] as const);
}
