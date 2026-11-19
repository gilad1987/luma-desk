import type { FixtureOptics } from '../../../domain/stage/optics/FixtureOptics';
import type { GdtfInfo } from '../GdtfInfo';
import { beamOptics } from './beamOptics';
import { colorOptics, shapingOptics } from './colorOptics';
import { compact, orAbsent } from './compact';
import type { OpticsDrop } from './OpticsDrop';
import { attributesLike, pick, placedFunctions } from './placedFunctions';
import { toFunction } from './toFunction';
import { panRange, tiltRange, zoomModes, zoomRange } from './rangeOptics';
import { goboOptics } from './wheelOptics';

/** The optics of one mode, and the values of the file that were not used. */
export interface GdtfOpticsResult {
  /** Absent when the mode gives no optical fact at all. */
  readonly optics?: FixtureOptics;
  readonly drops: readonly OpticsDrop[];
}

/**
 * What the GDTF says about the real device in the mode named `modeName` (the GDTF's own mode name, as
 * `modeChannels` returns it). It reads the values and checks each one for plausibility; whether the file as a whole
 * can be trusted for optical data is the caller's question (`fixtureOptics`).
 */
export function gdtfOptics(info: GdtfInfo, modeName: string): GdtfOpticsResult {
  const index = info.modes.findIndex((candidate) => candidate.name === modeName);
  const mode = info.modes[index];
  if (mode === undefined || info.optics === undefined) return { drops: [] };
  const placed = placedFunctions(info, index);
  const drops: OpticsDrop[] = [];
  const dimmer = pick(placed, 'Dimmer');
  // `ColorRGB_*` links no emitter, so the colour it makes is unknown; the drop tells the user why colour is missing
  const indirect = attributesLike(placed, /^ColorRGB_/).length > 0 && attributesLike(placed, /^ColorAdd_/).length === 0;
  if (indirect) drops.push({ part: 'colorMixing', reason: 'indirect' });
  const optics = compact<FixtureOptics>({
    dimmer: dimmer && toFunction(dimmer),
    pan: panRange(placed, drops),
    tilt: tiltRange(placed, drops),
    zoom: zoomRange(placed, drops),
    zoomModes: zoomModes(placed),
    ...beamOptics(info, mode, placed, drops),
    color: colorOptics(info, placed),
    gobos: orAbsent(goboOptics(info, placed)),
    shaping: shapingOptics(info, placed),
  });
  return Object.keys(optics).length > 0 ? { optics, drops } : { drops };
}
