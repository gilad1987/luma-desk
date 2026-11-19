import { clamp, lerp } from '../../core';
import { DEFAULT_ANGLE_DEG } from './beamProfile';
import { finiteOr } from './finite';
import { lumens, type Lumens } from './units';

/** The two ends of a zoom, from the GDTF. Angles are full angles in degrees. */
export interface ZoomEnds {
  /** Field angle (10 % of peak) at zoom 0. */
  readonly narrowFieldDeg: number;
  /** Field angle (10 % of peak) at zoom 1. */
  readonly wideFieldDeg: number;
  /** `BeamAngle` / `FieldAngle` of the fixture, 0..1. The zoom keeps it, so the edge softness does not change. */
  readonly beamToField: number;
  /** Lumens at zoom 0, when the maker gives the output per zoom end. */
  readonly narrowFlux?: number;
  /** Lumens at zoom 1, when the maker gives the output per zoom end. */
  readonly wideFlux?: number;
}

/** The beam at one zoom position: what `resolveBeamProfile` and `peakCandela` need. */
export interface ZoomState {
  readonly beamAngleDeg: number;
  readonly fieldAngleDeg: number;
  readonly flux: Lumens;
}

/**
 * The angles and the flux at a zoom position. The field angle goes linearly from the narrow end to the wide end.
 * The flux stays the same (an ideal zoom moves the light, so the peak intensity follows the angle: about 1 / 16 of
 * it from 10 to 40 degrees), unless both ends state their own flux: then it goes linearly between them. Source:
 * conservation of flux; the linear path between the ends is an assumption, a GDTF gives no curve.
 *
 * @param zoom position 0..1 (0 = narrow); NaN reads as 0
 * @param flux emitted flux in lumens, used when the ends give no flux of their own
 * @returns a field angle that is not finite (an end that is NaN or Infinity) reads as `DEFAULT_ANGLE_DEG`, and a
 *   `beamToField` that is NaN as 1
 */
export function zoomAt(ends: ZoomEnds, zoom: number, flux: Lumens): ZoomState {
  const t = clamp(Number.isNaN(zoom) ? 0 : zoom, 0, 1);
  const fieldAngleDeg = finiteOr(lerp(ends.narrowFieldDeg, ends.wideFieldDeg, t), DEFAULT_ANGLE_DEG);
  const perEnd = ends.narrowFlux !== undefined && ends.wideFlux !== undefined;
  return {
    beamAngleDeg: fieldAngleDeg * clamp(Number.isNaN(ends.beamToField) ? 1 : ends.beamToField, 0, 1),
    fieldAngleDeg,
    flux: lumens(finiteOr(perEnd ? Math.max(lerp(ends.narrowFlux, ends.wideFlux, t), 0) : flux, 0)),
  };
}
