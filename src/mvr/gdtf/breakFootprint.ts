import { UNIVERSE_CHANNELS } from '../../domain/stage/parse/parsePatch';
import type { GdtfChannel } from './GdtfInfo';

/**
 * How many DMX channels the lowest break of a mode takes from its start address: its highest offset, as 16-bit
 * channels take two offsets and gaps still belong to the fixture. The desk patches the lowest MVR break only (G9),
 * and that break carries the lowest GDTF break. `undefined` when the mode patches nothing, or claims more than one
 * universe or a fraction, which no break can hold, so the export estimates instead of trusting a broken file.
 */
export function breakFootprint(channels: readonly GdtfChannel[]): number | undefined {
  const patched = channels.filter((channel) => channel.offset.length > 0);
  const lowest = patched.reduce((low, channel) => Math.min(low, channel.dmxBreak), Infinity);
  const offsets = patched.filter((channel) => channel.dmxBreak === lowest).flatMap((channel) => channel.offset);
  const highest = offsets.reduce((high, offset) => Math.max(high, offset), 0);
  return Number.isInteger(highest) && highest >= 1 && highest <= UNIVERSE_CHANNELS ? highest : undefined;
}
