import { UNIVERSE_CHANNELS } from './parsePatch';
import type { Reader } from './readers';

/**
 * A fixture's DMX footprint: 1 to 512 channels, as one DMX break lies in one universe. Both the stored show's MVR
 * facts and the luma data of an MVR export carry it, so both read it with this one rule.
 */
export function parseFootprint(r: Reader, v: unknown, path: string): number | undefined {
  const channels = r.positiveInt(v, path);
  if (channels === undefined || channels <= UNIVERSE_CHANNELS) return channels;
  return r.fail(path, `expected at most ${UNIVERSE_CHANNELS} channels, got ${channels}`);
}
