import type { MvrFixtureInfo } from '../../domain/stage/mvr';
import type { LinkFootprint } from '../luma/lumaData';

/** Two GDTF names as `modeChannels` matches them: exactly, or equal after trimming, as writers pad names. */
const sameName = (a: string, b: string): boolean => a === b || a.trim() === b.trim();

/**
 * The link's footprint and body size when the `<Fixture>` still names the GDTF spec and mode they were measured for.
 * Another tool may change them and keep the desk's `<UserData>`; the old count would then pass as known and hide real
 * overlaps, and the old size would draw another product's body. Each is given only when the link has it: a mode with
 * no DMX footprint has a size but no count, and an older export has a count but no size.
 */
export function linkFootprint(
  info: MvrFixtureInfo,
  footprint: LinkFootprint | undefined,
): Pick<MvrFixtureInfo, 'footprint' | 'bodySize'> {
  if (footprint === undefined) return {};
  const same = sameName(footprint.gdtfSpec, info.gdtfName) && sameName(footprint.gdtfMode, info.gdtfMode);
  const { channels, bodySize } = footprint;
  const counted = channels === undefined ? {} : { footprint: channels };
  return same ? { ...counted, ...(bodySize === undefined ? {} : { bodySize }) } : {};
}
