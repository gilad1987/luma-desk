import { clamp } from '../../core';
import { finiteOr } from './finite';

/** The largest EV100 magnitude `saturationLuminance` uses. */
const MAX_EV = 100;

// The three EV presets are assumed values (no source): starting points chosen by eye, to tune against renders and
// photos of real shows, as the haze albedo and the haze phase lobes are.

/** A dark hall as the eye sees it: mid tones of the haze and the floor are visible. EV at ISO 100. Assumed. */
export const EV_EYE_DARK_HALL = 6;
/** A broadcast camera set for the lit stage: the haze is thin and the lit floor is not burnt out. EV100. Assumed. */
export const EV_BROADCAST_CAMERA = 8;
/** A photo exposed for the haze: the shafts are bright and lit surfaces clip. EV at ISO 100. Assumed. */
export const EV_HAZE_PHOTO = 5;

/** K of the saturation-based speed: 78 / (q x 100) with q = 0.65, the lens and sensor factor of ISO 12232. */
const SATURATION_FACTOR = 1.2;

/**
 * The exposure value at ISO 100 of a camera setting: EV100 = log2(N^2 / t) - log2(ISO / 100).
 * Source: the APEX system (ISO 2720), normalised to ISO 100.
 *
 * @param aperture f-number N (2.8 for f/2.8)
 * @param shutterSeconds exposure time t in seconds (1 / 50 for 1/50 s)
 * @param iso sensitivity (ISO arithmetic speed)
 * @returns EV100, no unit (a step of 1 is a factor of 2 in light); 0 when an argument is not a positive finite
 *   number (a shutter or ISO of 0 is no camera setting)
 */
export function ev100(aperture: number, shutterSeconds: number, iso: number): number {
  const valid = (value: number): boolean => Number.isFinite(value) && value > 0;
  if (!valid(aperture) || !valid(shutterSeconds) || !valid(iso)) return 0;
  return finiteOr(Math.log2((aperture * aperture) / shutterSeconds) - Math.log2(iso / 100), 0);
}

/**
 * The luminance that just saturates the sensor: L_max = 1.2 x 2^EV100.
 * Source: the saturation-based speed of ISO 12232, H_sat = 78 / S lux seconds.
 *
 * @param ev EV100, limited to -100..100 (far past any camera, and 2^EV stays finite); NaN reads as 0
 * @returns nits
 */
export function saturationLuminance(ev: number): number {
  return SATURATION_FACTOR * Math.pow(2, clamp(Number.isNaN(ev) ? 0 : ev, -MAX_EV, MAX_EV));
}

/**
 * The factor from scene luminance to the linear value before tone mapping: 1 / (1.2 x 2^EV100). A surface of
 * L_max nits then reads 1. The exposure is manual: an automatic one would lift a blackout to grey.
 *
 * @param ev EV100, from `ev100` or one of the presets
 * @returns 1 / nits
 */
export function exposureScale(ev: number): number {
  return 1 / saturationLuminance(ev);
}
