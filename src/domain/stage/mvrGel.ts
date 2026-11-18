import type { MvrDesignInfo, MvrFixtureInfo } from './mvr';
import { fileColorOf, type MvrDesignFileData, type MvrFileColor } from './mvrFileData';

/** A gel as desk colour values: red, green and blue in percent, at the level the file's `Y` gives. */
export type GelColor = readonly [r: number, g: number, b: number];

/** The white point D65 in CIE 1931 `x,y`, the `<Color>` most writers put on a fixture that has no colour. */
const WHITE_XY = [0.3127, 0.329] as const;
/** How far `x` and `y` may be from the white point and still be the writer's white. */
const WHITE_TOLERANCE = 0.005;

/**
 * Whether the fixture colours of the file are a colour plan. MVR 1.6, Fixture `Color`: "A color assigned to a
 * fixture. If it is not defined, there is no color for the fixture." Writers put a default on every fixture (white
 * `0.3127,0.3290,100` is usual), so one value on the whole rig says nothing; two or more distinct values do.
 */
export function hasColourPlan(mvr: MvrDesignFileData): boolean {
  return (mvr.colors?.length ?? 0) > 1;
}

/**
 * Whether a file colour is the writer's white: no filter is in front of such a unit, in a rig with a colour plan
 * too, where the gelled units have a colour and the open ones keep the default.
 */
export function isFileWhite(color: MvrFileColor): boolean {
  const [x, y] = color.xyY;
  return Math.abs(x - WHITE_XY[0]) <= WHITE_TOLERANCE && Math.abs(y - WHITE_XY[1]) <= WHITE_TOLERANCE;
}

/**
 * Whether the real device makes one colour only: its GDTF is trusted for optical data and names no colour system
 * (no emitters, no mixing filters, no colour wheel). Without trusted optics the desk cannot tell, so it is false.
 */
export function isSingleColour(info: MvrFixtureInfo): boolean {
  return info.optics !== undefined && info.optics.color === undefined;
}

/**
 * The gel of a fixture: the file colour of a single-colour unit in a rig with a colour plan. Such a unit cannot
 * change its colour, so the colour the designer assigned is the filter in front of it, and its beam and lens take
 * it. A colour-mixing fixture gets none: its file colour is a design note that a cue may or may not follow. White is
 * no gel, so the unit keeps the colour of its type. The CIE colour is "xyY absolute", and `rgb` is that colour with
 * its `Y` (0 to 100) as the level: a real gel transmits a part of the light, so a lower `Y` is a darker gel. A `Y`
 * above what the hue can have at full is full. Black is no light colour.
 */
export function fileGelOf(mvr: MvrDesignInfo, info: MvrFixtureInfo | undefined): GelColor | undefined {
  if (info === undefined || !hasColourPlan(mvr) || !isSingleColour(info)) return undefined;
  const color = fileColorOf(mvr, info);
  const high = color ? Math.max(...color.rgb) : 0;
  if (color === undefined || high <= 0 || isFileWhite(color)) return undefined;
  const full = Math.max(1, high);
  const [r, g, b] = color.rgb.map((part) => Math.round((Math.max(0, part) / full) * 1000) / 10);
  return [r ?? 0, g ?? 0, b ?? 0];
}
