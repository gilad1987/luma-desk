import type { DmxPatch } from '../DmxPatch';
import type { FieldReader, Key } from './fieldReader';
import { allDefined, describeValue, type Raw } from './rawValues';
import type { Reader } from './readers';

/**
 * The highest universe accepted. sACN (E1.31) numbers universes 1 to 63999 and Art-Net has fewer, so a higher one is
 * a typo or a broken file, and it cannot be written to any MVR `<Address>`. The MVR reader and writer use this one
 * value, so the show file and an MVR file accept the same range.
 */
export const MAX_UNIVERSE = 63_999;

/** The channels of one DMX universe; MVR's absolute addresses count across universes in steps of this size. */
export const UNIVERSE_CHANNELS = 512;

/** A reader for an integer field from `min` to `max`; its error names the range. */
function intIn(r: Reader, [min, max]: readonly [number, number]): FieldReader<number> {
  return (o, key, at) => {
    const v = o[key];
    const ok = typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
    return ok ? v : r.fail(r.path(at, key), `expected an integer from ${min} to ${max}, got ${describeValue(v)}`);
  };
}

/**
 * Reads a fixture's stored `patch` (contract Amendment 3: the MVR lane owns this reader). The ranges are the ones an
 * MVR file can hold, so a hand-edited show cannot carry an address that the export would have to reject.
 */
export function parsePatch(r: Reader, parent: Raw, key: Key, at: string): DmxPatch | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const patch = {
    universe: intIn(r, [1, MAX_UNIVERSE])(o, 'universe', path),
    address: intIn(r, [1, UNIVERSE_CHANNELS])(o, 'address', path),
    mode: r.str(o, 'mode', path),
  };
  return allDefined(patch) ? patch : undefined;
}
