import type { BandPoint, StageFrame } from '../domain/stage/StageFrame';
import { BAND_PTS, DECK, RING, SCREEN } from '../domain/venue';

/**
 * The stage numbers the position presets aim at, in metres. A stage may lack a ring, a screen or a band, so a stage
 * frame is first resolved into this complete set (`presetFnsOf`), and the preset formulas need no branch for a
 * missing part.
 */
export interface PresetAim {
  /** The deck surface height. */
  readonly deckY: number;
  /** The ring centre in plan view and its radius `R`. */
  readonly ring: Pick<NonNullable<StageFrame['ring']>, 'x' | 'z' | 'R'>;
  /** The z of the LED screen plane. */
  readonly screenZ: number;
  /** Never empty: the `band` preset cycles through it. */
  readonly band: readonly BandPoint[];
}

/** The built-in Sultan's Pool numbers, read from the venue constants the original presets read. */
export const VENUE_AIM: PresetAim = { deckY: DECK, ring: RING, screenZ: SCREEN.z, band: BAND_PTS };
