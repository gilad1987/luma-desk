import type { AttrName } from '../../domain/attributes';
import type { FixtureTypeId } from '../../domain/FixtureType';
import type { GdtfChannel, GdtfInfo } from './GdtfInfo';
import { isLightChannel } from './isLightChannel';

/** Beam types whose soft edge reads as a wash on stage. */
const WASH_BEAMS: ReadonlySet<string> = new Set(['Wash', 'PC', 'Fresnel']);

/** A full beam angle at or under this, in degrees, is a beam fixture whatever its optics. */
const NARROW_BEAM_DEG = 6;

/**
 * The desk type of a moving head. The angle test runs first: beam fixtures (Sharpy and the like) declare their beam as
 * `Spot`, so a type-first order would never give `beam`. Other beam types (`Rectangle`, `Glow`, `None`) fall back to
 * `spot`, the generic moving head.
 */
function movingHeadType(info: GdtfInfo): FixtureTypeId {
  if (info.beamAngle !== undefined && info.beamAngle <= NARROW_BEAM_DEG) return 'beam';
  if (info.beamType !== undefined && WASH_BEAMS.has(info.beamType)) return 'wash';
  return 'spot';
}

/**
 * The desk fixture type that draws and drives an MVR fixture, or `'object'` for a GDTF without beam and light channel (a
 * speaker or a motor). The element stays a fixture all the same: `classifyFixture` gives it a desk type, because an
 * MVR `<Fixture>` with a patch must never be lost. Rules, in order: no GDTF gives `par` (the caller warns
 * `missing-gdtf`); no beam and no light channel (`isLightChannel`) gives `object`; pan and tilt give a moving head; tilt without pan gives `bar`
 * (a tilting batten); else `par`.
 */
export function classifyType(info: GdtfInfo | undefined, channels: readonly GdtfChannel[]): FixtureTypeId | 'object' {
  if (info === undefined) return 'par';
  const has = (attr: AttrName): boolean => channels.some((channel) => channel.attr === attr);
  if (!info.hasBeam && !channels.some(isLightChannel)) return 'object';
  if (has('pan') && has('tilt')) return movingHeadType(info);
  if (has('tilt')) return 'bar';
  return 'par';
}
