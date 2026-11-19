import type { OpticsOutput } from '../../../domain/stage/optics/FixtureOptics';
import { compact } from './compact';
import { beamFlux } from './fluxOptics';
import type { GdtfBeamRead } from './GdtfOpticsSource';
import type { OpticsDrop } from './OpticsDrop';

/** The parts of the output that come from the mode's structure, not from the `Beam` attributes. */
export type Structure = Pick<OpticsOutput, 'beamCount' | 'pixelControl'>;

/** The GDTF `Beam` defaults (table 41) that a writer also leaves alone among real values. */
const DEFAULT = { lampType: 'Discharge', colorTemperature: 6000, cri: 100, luminousFlux: 10000, angle: 25 };
/** The lamp types whose light has a CRI of 100: a thermal source. */
const THERMAL = new Set(['Tungsten', 'Halogen']);

const positive = (value: number | undefined): number | undefined =>
  value !== undefined && value > 0 ? value : undefined;

/**
 * The output values of the mode's first beam. A beam with some real values can still carry single spec defaults that
 * the writer never set, and those are dropped as `loneDefault`: a CRI of 100 on a lamp that is not tungsten or
 * halogen; `LampType` Discharge on a mode with additive emitters (`ColorAdd_*`), which are LEDs; 6000 K when that
 * lamp type was dropped; 10000 lm when both angles are 25 degrees, an absent angle counting as its default 25.
 */
export function outputOptics(
  beams: readonly [GdtfBeamRead, ...GdtfBeamRead[]],
  structure: Structure,
  additive: boolean,
  drops: OpticsDrop[],
): OpticsOutput {
  const [first] = beams;
  const loneDefault = (part: OpticsDrop['part'], isDefault: boolean): boolean => {
    if (isDefault) drops.push({ part, reason: 'loneDefault' });
    return isDefault;
  };
  const angles = [first.beamAngle ?? DEFAULT.angle, first.fieldAngle ?? DEFAULT.angle];
  const defaultFlux = first.luminousFlux === DEFAULT.luminousFlux && angles.every((a) => a === DEFAULT.angle);
  const noLamp = loneDefault('lampType', additive && first.lampType === DEFAULT.lampType);
  const lampType = noLamp ? undefined : first.lampType;
  const luminousFlux = loneDefault('flux', defaultFlux) ? undefined : beamFlux(beams, lampType, drops);
  const defaultKelvin = noLamp && first.colorTemperature === DEFAULT.colorTemperature;
  const cri = first.cri !== undefined && first.cri >= 0 && first.cri <= 100 ? first.cri : undefined;
  const defaultCri = cri === DEFAULT.cri && !THERMAL.has(first.lampType ?? '');
  return compact<OpticsOutput>({
    luminousFlux,
    powerConsumption: positive(first.powerConsumption),
    colorTemperature: loneDefault('colorTemperature', defaultKelvin) ? undefined : positive(first.colorTemperature),
    cri: loneDefault('cri', defaultCri) ? undefined : cri,
    lampType,
    ...structure,
  });
}
