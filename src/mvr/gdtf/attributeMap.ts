import type { AttrName } from '../../domain/attributes';

/** GDTF attribute names that map one to one to a desk attribute. */
const EXACT: ReadonlyMap<string, AttrName> = new Map<string, AttrName>([
  ['Dimmer', 'dim'],
  ['Pan', 'pan'],
  ['Tilt', 'tilt'],
  ['ColorAdd_R', 'r'],
  ['ColorAdd_G', 'g'],
  ['ColorAdd_B', 'b'],
  ['ColorRGB_Red', 'r'],
  ['ColorRGB_Green', 'g'],
  ['ColorRGB_Blue', 'b'],
  ['ColorRGB_R', 'r'],
  ['ColorRGB_G', 'g'],
  ['ColorRGB_B', 'b'],
  ['Gobo1', 'gobo'],
  ['Gobo1Pos', 'grot'],
  ['Gobo1PosRotate', 'grot'],
  ['Zoom', 'zoom'],
  ['Shutter1', 'strobe'],
]);

/** GDTF attribute families that share a prefix (`Shutter1StrobeRandom`, `StrobeFrequency`). */
const PREFIXES: readonly (readonly [string, AttrName])[] = [
  ['Shutter1Strobe', 'strobe'],
  ['Strobe', 'strobe'],
];

/**
 * True for `Dimmer1`, `Dimmer2`... The GDTF spec does not enumerate `Dimmer` (only names it writes with `(n)`, such
 * as `Gobo(n)`, take a number), but Capture's placeholder GDTFs name every intensity channel this way and none
 * `Dimmer`. Without this rule such a fixture has no dimmer at all and does not read as a light.
 */
export function isIndexedDimmer(attribute: string): boolean {
  return /^Dimmer\d+$/.test(attribute);
}

/**
 * The desk attribute a GDTF attribute drives, or `undefined` when the desk has none. Only the first instance of an
 * attribute (`Gobo1`, `Shutter1`) maps, because the desk has one gobo wheel and one shutter per fixture. Names match
 * with case, as GDTF defines them. An indexed dimmer (`isIndexedDimmer`) is a dimmer.
 */
export function attributeToAttr(attribute: string): AttrName | undefined {
  if (isIndexedDimmer(attribute)) return 'dim';
  return EXACT.get(attribute) ?? PREFIXES.find(([prefix]) => attribute.startsWith(prefix))?.[1];
}
