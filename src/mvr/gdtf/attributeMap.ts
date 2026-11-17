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
 * The desk attribute a GDTF attribute drives, or `undefined` when the desk has none. Only the first instance of an
 * attribute (`Gobo1`, `Shutter1`) maps, because the desk has one gobo wheel and one shutter per fixture. Names match
 * with case, as GDTF defines them.
 */
export function attributeToAttr(attribute: string): AttrName | undefined {
  return EXACT.get(attribute) ?? PREFIXES.find(([prefix]) => attribute.startsWith(prefix))?.[1];
}
