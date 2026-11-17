import type { DmxPatch } from '../DmxPatch';
import { allDefined, describeValue, type Reader } from './readers';

/**
 * The highest universe accepted. sACN (E1.31) numbers universes 1 to 63999 and Art-Net has fewer, so a higher one is
 * a typo or a broken file, and it cannot be written to any MVR `<Address>`. The MVR reader and writer use this one
 * value, so the show file and an MVR file accept the same range.
 */
export const MAX_UNIVERSE = 63_999;

/** The channels of one DMX universe; MVR's absolute addresses count across universes in steps of this size. */
export const UNIVERSE_CHANNELS = 512;

/** An integer from `min` to `max`, or an error that names the range. */
function intIn(r: Reader, v: unknown, path: string, [min, max]: readonly [number, number]): number | undefined {
  const ok = typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
  return ok ? v : r.fail(path, `expected an integer from ${min} to ${max}, got ${describeValue(v)}`);
}

/**
 * Reads a fixture's stored `patch` (contract Amendment 3: the MVR lane owns this reader). The ranges are the ones an
 * MVR file can hold, so a hand-edited show cannot carry an address that the export would have to reject.
 */
export function parsePatch(r: Reader, raw: unknown, path: string): DmxPatch | undefined {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const patch = {
    universe: intIn(r, o.universe, `${path}.universe`, [1, MAX_UNIVERSE]),
    address: intIn(r, o.address, `${path}.address`, [1, UNIVERSE_CHANNELS]),
    mode: r.str(o.mode, `${path}.mode`),
  };
  return allDefined(patch) ? patch : undefined;
}
