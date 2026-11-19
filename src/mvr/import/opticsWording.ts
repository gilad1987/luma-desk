import type { FixtureTypeId } from '../../domain/FixtureType';
import { TYPES } from '../../domain/fixtureTypes';
import { byCount } from '../byCount';
import type { OpticsDrop } from '../gdtf/optics/OpticsDrop';
import type { OpticsDistrust } from './fixtureOptics';

/** A part of the device data that a GDTF can give. */
export type OpticsPart = 'optics' | 'panTilt' | 'color' | 'gobos' | 'shaping';

const WHY: Readonly<Record<OpticsDistrust, string>> = {
  noGdtf: 'no GDTF file in the archive',
  vendorSymbol: 'the GDTF is a CAD stand-in with no trustworthy optical data',
  generic: 'the GDTF is a generic stand-in with no trustworthy optical data',
  noData: 'the GDTF has no trustworthy optical data',
};

const DROP_PART: Readonly<Record<OpticsDrop['part'], string>> = {
  pan: 'pan range',
  tilt: 'tilt range',
  zoom: 'zoom range',
  beam: 'beam data',
  beamAngle: 'beam angle',
  fieldAngle: 'field angle',
  flux: 'luminous flux',
  lampType: 'lamp type',
  colorTemperature: 'colour temperature',
  cri: 'colour rendering index',
  colorMixing: 'colour mixing',
};

const DROP_REASON: Readonly<Record<OpticsDrop['reason'], string>> = {
  missing: 'not stated',
  noRange: 'no real range',
  tooSmall: 'under 90 degrees',
  outOfRange: 'not an angle from 0 to 180 degrees',
  specDefaults: 'only GDTF default values',
  zero: 'zero',
  belowBeam: 'smaller than the beam angle',
  implausible: 'more lumens per watt than the lamp type can give',
  loneDefault: 'the GDTF default value, which nothing else confirms',
  indirect: 'indirect colour mixing; the desk keeps its own colour model',
};

/** "a", "a and b", "a, b and c". */
function joinAnd(words: readonly string[]): string {
  const last = words.at(-1) ?? '';
  return words.length < 2 ? last : `${words.slice(0, -1).join(', ')} and ${last}`;
}

function partWord(part: OpticsPart, goboWheels: number): string {
  if (part === 'gobos') return `${goboWheels} gobo ${byCount(goboWheels, 'wheel', 'wheels')}`;
  const words = { optics: 'optics', panTilt: 'pan/tilt', color: 'colour', shaping: 'beam shaping' };
  return words[part];
}

/** The facts of one summary line that its English sentence is made from. */
export interface OpticsLineFacts {
  readonly product: string;
  readonly type: FixtureTypeId;
  readonly parts: readonly OpticsPart[];
  readonly goboWheels: number;
  readonly reason?: OpticsDistrust;
  readonly drops: readonly OpticsDrop[];
  readonly count: number;
}

/** The English sentence of one line: what comes from the GDTF, or why the desk type's defaults stay. */
export function opticsMessage(line: OpticsLineFacts): string {
  const head = `${line.count} ${byCount(line.count, 'fixture', 'fixtures')} of "${line.product}":`;
  const defaults = `desk defaults for type ${TYPES[line.type].name} are used`;
  if (line.reason !== undefined) return `${head} ${WHY[line.reason]}; ${defaults}.`;
  const words = line.parts.map((part) => partWord(part, line.goboWheels));
  const verb = words.length === 1 && line.parts[0] !== 'gobos' ? 'comes' : 'come';
  const unused = line.drops.map((drop) => `${DROP_PART[drop.part]} (${DROP_REASON[drop.reason]})`);
  const rest = unused.length > 0 ? `; not used: ${unused.join(', ')}; ${defaults} for the rest` : '';
  return `${head} ${joinAnd(words)} ${verb} from the GDTF${rest}.`;
}
