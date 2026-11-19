import type { NamedColor } from '../../engine/colorByName';
import { paletteOf } from '../../show/mvrLook/lookPalette';

/** One content colour of the LED walls: linear RGB, as the render takes it. */
export type LedColour = readonly [number, number, number];

/**
 * The share of a full desk colour level that the wall content shows. The content is a moving field between its
 * colours, not a flood of one of them, and at this share the walls sit with the rig the look lights in the same pair.
 */
const CONTENT_LEVEL = 0.55;

const contentOf = ({ r, g, b }: NamedColor): LedColour => [
  (r / 100) * CONTENT_LEVEL,
  (g / 100) * CONTENT_LEVEL,
  (b / 100) * CONTENT_LEVEL,
];

/**
 * The three content colours of the LED walls for a rig with this many fixtures: the colour pair the MVR first look
 * chooses for that rig (`paletteOf`, by the same count), and a paler tone between the two. Plain data: the render
 * code knows nothing of the show.
 */
export function ledPaletteOf(fixtureCount: number): LedColour[] {
  const { primary, accent } = paletteOf(fixtureCount);
  const [first, second] = [contentOf(primary), contentOf(accent)];
  const between = (i: 0 | 1 | 2): number => ((first[i] + second[i]) / 2) * 0.6 + 0.25;
  return [first, second, [between(0), between(1), between(2)]];
}

/**
 * Gives the generated LED content the colour pair of the first look of the rig now on stage, so the walls and the
 * lighting are one picture. The LED module is part of the scenery chunk, which is loaded before an MVR stage draws;
 * when it is not there no wall draws either, so there is nothing to colour and nothing to report.
 */
export function followLookPalette(fixtureCount: number): void {
  const colours = ledPaletteOf(fixtureCount);
  void import('../../render/mvr/led/ledUniforms')
    .then((uniforms) => uniforms.setLedPalette(colours))
    .catch(() => undefined);
}
