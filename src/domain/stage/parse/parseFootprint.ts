import { UNIVERSE_CHANNELS } from './parsePatch';
import type { Key } from './fieldReader';
import type { Raw } from './rawValues';
import type { Reader } from './readers';

/**
 * A fixture's DMX footprint: 1 to 512 channels, as one DMX break lies in one universe. Both the stored show's MVR
 * facts and the luma data of an MVR export carry it, so both read it with this one rule.
 */
export function parseFootprint(r: Reader, o: Raw, key: Key, at: string): number | undefined {
  const channels = r.positiveInt(o, key, at);
  if (channels === undefined || channels <= UNIVERSE_CHANNELS) return channels;
  return r.fail(r.path(at, key), `expected at most ${UNIVERSE_CHANNELS} channels, got ${channels}`);
}
