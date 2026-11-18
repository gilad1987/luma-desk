import type { FixtureType, FixtureTypeId } from '../../domain/FixtureType';
import { TYPES } from '../../domain/fixtureTypes';
import { classifyType } from '../gdtf/classifyType';
import type { GdtfChannel, GdtfInfo } from '../gdtf/GdtfInfo';
import { isGenericGdtf } from '../gdtf/isGenericGdtf';
import { typeFromKeywords } from './typeFromKeywords';

/** The desk type of a fixture that has a GDTF, and whether a name keyword, not the GDTF, chose it. */
export interface FixtureClass {
  readonly type: FixtureTypeId | 'object';
  /** True when the name overrode the GDTF channels, so the summary can say the type is a guess. */
  readonly fromName: boolean;
}

/** True for the types drawn with a moving-head body, which need pan and tilt to aim. */
function pans(type: FixtureTypeId): boolean {
  const known: FixtureType = TYPES[type];
  return known.attrs.includes('pan');
}

/** The type the first name with a known keyword suggests; earlier names are the more reliable ones. */
function typeFromNames(names: readonly string[]): FixtureTypeId | undefined {
  for (const name of names) {
    const type = typeFromKeywords(name);
    if (type !== undefined) return type;
  }
  return undefined;
}

/**
 * Whether the name's type replaces the channels' type. A moving-head type needs pan and tilt in the channels, so a
 * fixture that cannot move never gets a moving body. Otherwise a generic GDTF always yields to the name, and a real
 * GDTF only when both types are static: its channels then cannot tell a par from a strobe, a blinder or a bar.
 */
function nameWins(named: FixtureTypeId, fromChannels: FixtureTypeId, generic: boolean): boolean {
  if (pans(named) && !pans(fromChannels)) return false;
  return generic || !pans(fromChannels);
}

/**
 * The desk type of a fixture whose GDTF was read. The channels decide first (`classifyType`: pan and tilt, beam type
 * and the narrow beam angle). The `names` (GDTF spec, GDTF name, MVR fixture name, most reliable first) then refine
 * it by `nameWins`, because generic stand-in GDTFs make every product a moving wash and no channel set says
 * "strobe". A real GDTF that classifies as a moving head keeps its type whatever its name says.
 */
export function classifyFixture(
  info: GdtfInfo,
  channels: readonly GdtfChannel[],
  names: readonly string[],
): FixtureClass {
  const fromChannels = classifyType(info, channels);
  if (fromChannels === 'object') return { type: fromChannels, fromName: false };
  const named = typeFromNames(names);
  if (named === undefined || named === fromChannels) return { type: fromChannels, fromName: false };
  if (!nameWins(named, fromChannels, isGenericGdtf(channels))) return { type: fromChannels, fromName: false };
  return { type: named, fromName: true };
}
