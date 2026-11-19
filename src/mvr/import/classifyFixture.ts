import type { FixtureType, FixtureTypeId } from '../../domain/FixtureType';
import { TYPES } from '../../domain/fixtureTypes';
import { classifyType } from '../gdtf/classifyType';
import type { GdtfChannel, GdtfInfo } from '../gdtf/GdtfInfo';
import { isGenericGdtf } from '../gdtf/isGenericGdtf';
import { isPlaceholderGdtf } from '../gdtf/isPlaceholderGdtf';
import { typeFromKeywords } from '../gdtf/typeFromKeywords';

/** The desk type of a fixture that has a GDTF, and whether a name keyword, not the GDTF, chose it. */
export interface FixtureClass {
  readonly type: FixtureTypeId;
  /** True when the name overrode the GDTF channels, so the summary can say the type is a guess. */
  readonly fromName: boolean;
  /**
   * Set when the GDTF did not type the fixture as a light: `placeholder` for a stand-in file that says nothing of
   * the product, `device` for a real file with no beam and no dimmer (a hoist, a speaker). The summary reports both.
   */
  readonly standIn?: 'placeholder' | 'device';
  /** What says a `device` is no light: the file's `CustomIdType`, its GDTF, or a name word (hoist, hazer). */
  readonly deviceBy?: 'custom-id' | 'gdtf' | 'name';
}

/**
 * The type of a light that nothing else types. The desk has no conventional-dimmer type, so it is the `par`, the simplest light the desk draws and the type `fallbackType` gives a missing GDTF.
 */
const GENERIC_TYPE: FixtureTypeId = 'par';

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
 * The type the name suggests for this fixture: the word `profile` names the static ellipsoidal, but a profile whose
 * channels pan is a moving profile, which the desk draws as its generic moving head.
 */
function namedFor(named: FixtureTypeId, fromChannels: FixtureTypeId): FixtureTypeId {
  return named === 'profile' && pans(fromChannels) ? 'spot' : named;
}

/**
 * Whether the name's type replaces the channels' type. A generic GDTF always yields to the name: a stand-in without
 * pan and tilt cannot prove the fixture is static, so a "Wash" stub draws as a wash. A real GDTF yields only when
 * both types are static: its channels then cannot tell a par from a strobe, a blinder or a bar, and a real GDTF that
 * cannot move never gets a moving body.
 */
function nameWins(named: FixtureTypeId, fromChannels: FixtureTypeId, generic: boolean): boolean {
  return generic || (!pans(fromChannels) && !pans(named));
}

/**
 * The desk type of a fixture whose GDTF was read. The channels decide first (`classifyType`: pan and tilt, beam type
 * and the narrow beam angle). The `names` (GDTF spec, GDTF name, MVR fixture name, most reliable first) then refine
 * it by `nameWins`, because generic stand-in GDTFs make every product a moving wash and no channel set says
 * "strobe". A real GDTF that classifies as a moving head keeps its type whatever its name says. A placeholder GDTF
 * (`isPlaceholderGdtf`) proves nothing, so the name decides, else the channels' type. A GDTF with real channels but
 * no beam and no dimmer (a hoist) is a `device`. Every result is a desk type: a `<Fixture>` is never dropped.
 */
export function classifyFixture(
  info: GdtfInfo,
  channels: readonly GdtfChannel[],
  names: readonly string[],
): FixtureClass {
  const fromData = classifyType(info, channels);
  const fromChannels = fromData === 'object' ? GENERIC_TYPE : fromData;
  const word = typeFromNames(names);
  const named = word === undefined ? undefined : namedFor(word, fromChannels);
  if (isPlaceholderGdtf(info, channels)) {
    if (named === 'device') return { type: named, fromName: true, standIn: 'device', deviceBy: 'name' };
    return { type: named ?? fromChannels, fromName: named !== undefined, standIn: 'placeholder' };
  }
  if (fromData === 'object') return { type: 'device', fromName: false, standIn: 'device', deviceBy: 'gdtf' };
  // a real GDTF with light channels is a light, whatever its name says ("Fan Par")
  if (named === undefined || named === 'device' || named === fromChannels)
    return { type: fromChannels, fromName: false };
  if (!nameWins(named, fromChannels, isGenericGdtf(channels))) return { type: fromChannels, fromName: false };
  return { type: named, fromName: true };
}
