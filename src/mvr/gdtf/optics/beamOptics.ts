import type { FixtureOptics, OpticsBeam } from '../../../domain/stage/optics/FixtureOptics';
import type { GdtfInfo, GdtfMode } from '../GdtfInfo';
import { compact } from './compact';
import type { GdtfBeamRead } from './GdtfOpticsSource';
import type { OpticsDrop } from './OpticsDrop';
import { outputOptics, type Structure } from './outputOptics';
import { attributesLike, pick, type PlacedFunction } from './placedFunctions';

/** The GDTF defaults of a `Beam` (table 41): flux 10000 lm, beam and field angle 25 degrees, 6000 K, 1000 W. */
const SPEC_DEFAULTS = {
  luminousFlux: 10000,
  beamAngle: 25,
  fieldAngle: 25,
  colorTemperature: 6000,
  powerConsumption: 1000,
};
const MAX_ANGLE = 180;

/**
 * True when the beam writes at least one of the five values and none of them differs from its spec default. A flux
 * of exactly 10000 lm is believed only when another value shows that the writer set real data.
 */
function isSpecDefault(beam: GdtfBeamRead): boolean {
  const keys = Object.keys(SPEC_DEFAULTS) as (keyof typeof SPEC_DEFAULTS)[];
  const written = keys.filter((key) => beam[key] !== undefined);
  return written.length > 0 && written.every((key) => beam[key] === SPEC_DEFAULTS[key]);
}

/** The largest number of copies a dimmer or colour channel has: above 1 when beams are driven one by one. */
function copies(placed: readonly PlacedFunction[]): number {
  const attributes = ['Dimmer', ...attributesLike(placed, /^Color(Add|Sub|RGB)_/)];
  return Math.max(0, ...attributes.map((attribute) => pick(placed, attribute)?.drives.length ?? 0));
}

/** The written values of the mode's first beam, which is not all spec defaults, each checked on its own. */
function written(
  beams: readonly [GdtfBeamRead, ...GdtfBeamRead[]],
  structure: Structure,
  additive: boolean,
  drops: OpticsDrop[],
): Pick<FixtureOptics, 'beam' | 'output'> {
  const [first] = beams;
  const angle = (value: number | undefined, part: OpticsDrop['part']): number | undefined => {
    if (value === undefined || (value > 0 && value <= MAX_ANGLE)) return value;
    drops.push({ part, reason: 'outOfRange' });
    return undefined;
  };
  const positive = (value: number | undefined): number | undefined =>
    value !== undefined && value > 0 ? value : undefined;
  const output = outputOptics(beams, structure, additive, drops);
  const beamAngle = angle(first.beamAngle, 'beamAngle');
  const field = angle(first.fieldAngle, 'fieldAngle');
  const narrow = field !== undefined && beamAngle !== undefined && field < beamAngle;
  if (narrow) drops.push({ part: 'fieldAngle', reason: 'belowBeam' });
  const rectangle = first.beamType === 'Rectangle';
  const beam = compact<OpticsBeam>({
    beamType: first.beamType,
    beamAngle,
    fieldAngle: narrow ? undefined : field,
    beamRadius: positive(first.beamRadius),
    rectangleRatio: rectangle ? positive(first.rectangleRatio) : undefined,
    throwRatio: rectangle ? positive(first.throwRatio) : undefined,
  });
  return Object.keys(beam).length > 0 ? { beam, output } : { output };
}

/**
 * The fixed optics and the output of the mode's geometry tree, from its first `Beam`. The values are the written
 * ones only: an attribute the file leaves out stays absent. A beam of spec defaults gives the beam count alone.
 */
export function beamOptics(
  info: GdtfInfo,
  mode: GdtfMode,
  placed: readonly PlacedFunction[],
  drops: OpticsDrop[],
): Pick<FixtureOptics, 'beam' | 'output'> {
  const beams = (info.optics?.beams ?? []).filter((beam) => mode.geometry === '' || beam.root === mode.geometry);
  const [first, ...rest] = beams;
  if (first === undefined) return {};
  const beamCount = beams.reduce((sum, beam) => sum + beam.count, 0);
  const structure = { beamCount, pixelControl: beamCount > 1 && copies(placed) > 1 };
  const additive = attributesLike(placed, /^ColorAdd_/).length > 0;
  if (!isSpecDefault(first)) return written([first, ...rest], structure, additive, drops);
  drops.push({ part: 'beam', reason: 'specDefaults' });
  return { output: structure };
}
