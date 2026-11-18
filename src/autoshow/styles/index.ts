import type { AutoStyle } from '../AutoStyle';
import { BAND_STYLES } from './bandStyles';
import { CALM_STYLES } from './calmStyles';
import { CLUB_STYLES } from './clubStyles';

/** The id of an auto-show style; the panel keeps it in the settings and the Hebrew taglines are keyed by it. */
export type AutoStyleId = keyof typeof CLUB_STYLES | keyof typeof BAND_STYLES | keyof typeof CALM_STYLES;

/**
 * Every auto-show style by id. The key order is the button order in the style grid, so the groups are interleaved
 * back into the original order instead of being spread one after another.
 */
export const STYLES: Readonly<Record<AutoStyleId, AutoStyle>> = {
  edm: CLUB_STYLES.edm,
  techno: CLUB_STYLES.techno,
  rock: BAND_STYLES.rock,
  pop: BAND_STYLES.pop,
  hiphop: CLUB_STYLES.hiphop,
  mizrahi: CLUB_STYLES.mizrahi,
  ballad: CALM_STYLES.ballad,
  orchestral: CALM_STYLES.orchestral,
  cinematic: CALM_STYLES.cinematic,
};

const isStyleId = (id: string): id is AutoStyleId => id in STYLES;

/**
 * Every style id in the key order of `STYLES`, the button order of the style grid. `Object.keys` returns plain
 * strings, so the guard narrows them once here instead of in each caller.
 */
export const STYLE_IDS: readonly AutoStyleId[] = Object.keys(STYLES).filter(isStyleId);
