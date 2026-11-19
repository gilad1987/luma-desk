import type { NamedColor } from '../../engine/colorByName';
import type { PresetFn } from '../../engine/positionPresets';
import type { Placed } from './lookArea';

/** One colour pair of the first look: `primary` tones the deck, `accent` is on the sides, the beams and the bars. */
export interface LookPalette {
  readonly name: string;
  readonly primary: NamedColor;
  readonly accent: NamedColor;
}

/**
 * Four pairs that work on any stage: a deep saturated tone and a lighter or complementary accent that stays readable
 * as a shaft in haze. Values are desk colour levels (0-100), written out so a change of the preset list cannot change
 * a saved look.
 */
export const LOOK_PALETTES: readonly LookPalette[] = [
  { name: 'deep blue + amber', primary: { r: 0, g: 10, b: 100 }, accent: { r: 100, g: 58, b: 0 } },
  { name: 'magenta + cyan', primary: { r: 100, g: 0, b: 65 }, accent: { r: 0, g: 85, b: 100 } },
  { name: 'red + cool white', primary: { r: 100, g: 0, b: 0 }, accent: { r: 72, g: 86, b: 100 } },
  { name: 'congo + lavender', primary: { r: 30, g: 0, b: 100 }, accent: { r: 68, g: 52, b: 100 } },
];

/** Key light: a warm white of about 3600 K as RGB levels, the colour a face reads best in. */
export const KEY_WHITE: NamedColor = { r: 100, g: 80, b: 58 };
/** Follow spots run open white, so the performer stands out of the warm key. */
export const OPEN_WHITE: NamedColor = { r: 100, g: 100, b: 100 };
/** Blinders at rest: the amber of a dimmed tungsten lamp. */
export const TUNGSTEN_GLOW: NamedColor = { r: 100, g: 62, b: 28 };

/** Knuth's multiplicative hash constant: it spreads neighbouring fixture counts over the palettes. */
const HASH_MUL = 2654435761;

/**
 * The palette of a rig, chosen from its fixture count: two files usually differ, one file always gets the same
 * pair. A count that is not a whole number counts as 0.
 */
export function paletteOf(fixtureCount: number): LookPalette {
  const count = Number.isFinite(fixtureCount) ? Math.floor(fixtureCount) : 0;
  const index = Math.floor(((Math.imul(count, HASH_MUL) >>> 0) / 2 ** 32) * LOOK_PALETTES.length);
  const palette = LOOK_PALETTES[index];
  if (palette === undefined) throw new RangeError(`MVR first look: no palette ${index}`);
  return palette;
}

/** Height in decimetres: mirrored towers hang their units at the same heights, also with float noise in the file. */
const level = (f: Placed): number => Math.round(f.pos.y * 10);

/**
 * Alternating colours up a tower: the heights of `fixtures` are ranked from the lowest, even ranks take `accent` and
 * odd ranks `primary`. A unit and its mirror image hang at one height, so both sides alternate the same way.
 */
export function colorByHeightOf(fixtures: readonly Placed[], palette: LookPalette): PresetFn {
  const heights = [...new Set(fixtures.map(level))].sort((a, b) => a - b);
  return (f) => ({ ...(heights.indexOf(level(f)) % 2 === 1 ? palette.primary : palette.accent) });
}
