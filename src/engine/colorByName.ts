import { COLORS } from './presetColors';

/** A preset colour as attribute values on the desk's 0-100 scale, ready to spread into a fixture's values. */
export interface NamedColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * The preset colour with this name. Style palettes and the demo show name colours, so an unknown name is a data error
 * and throws, as the original lookup did when it read a field of a missing entry.
 */
export function colorByName(name: string): NamedColor {
  const entry = COLORS.find((c) => c[0] === name);
  if (!entry) throw new Error(`Unknown preset colour "${name}"`);
  return { r: entry[1], g: entry[2], b: entry[3] };
}
