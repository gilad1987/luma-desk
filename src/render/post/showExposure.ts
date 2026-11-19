import { MVR_EXPOSURE } from './mvrTone';

/**
 * The show camera of an MVR stage: a bounded, slow exposure, the way a camera operator rides the iris. The picture
 * keeps the base exposure while the scene is in the band of a show look; when every fixture is at full the camera
 * closes by up to one stop, so the frame does not go to a flat white, and in a near-dark scene it opens by up to
 * half a stop. The bounds keep a blackout black. The numbers of the meter are here, for its shader and its tests.
 */

/** The meter image: cells over the frame, and the stops (log2 of scene radiance) its two bytes hold. */
export const METER = { width: 16, height: 9, low: -8, high: 8, most: 4 } as const;

/**
 * The share of the cells that the camera meters: the brightest quarter of the frame, its highlights. A show frame is
 * mostly a dark house, and a mean over every cell follows the dark part: on three real files it moved by 1.1 to
 * 1.5 stops between the first look and every fixture at full, less than between two views of one look.
 */
const HIGHLIGHTS = 0.25;
/**
 * The band of the highlights in which the exposure does not move, in stops (log2 of scene radiance; a white
 * surface in the key is -1.7). Measured on three real files at the default settings: the first look reads -4.96
 * to -3.71 from FOH and -6.06 to -5.36 in the Wide view, so both keep the base exposure; every fixture at full
 * reads -3.43 to -2.70 from FOH and closes the camera by 0.2 to 0.9 stop.
 */
export const SHOW_BAND = { low: -6.5, high: -3.6 } as const;
/** The most the camera closes and opens, in stops. */
export const EXPOSURE_RANGE = { down: 1, up: 0.5 } as const;
/** Stops of exposure per stop of scene past the band: the camera holds the highlights at the edge of the band. */
const FOLLOW = 1;
/** The time constant of the iris in seconds. */
export const ADAPT_SECONDS = 1;
/** A clock step of this many seconds or more is no running show: a stepped test clock, a stall, a woken tab. */
const MAX_STEP = 0.1;

const float = (value: number): string => value.toFixed(1);

/** The meter numbers as GLSL constants, so the shader and `meteredStops` cannot differ. */
export const meterConstants = [
  `const vec2 METER_SIZE = vec2(${float(METER.width)}, ${float(METER.height)});`,
  `const float METER_LOW = ${float(METER.low)};`,
  `const float METER_HIGH = ${float(METER.high)};`,
  `const float METER_MOST = ${float(METER.most)};`,
].join('\n');

/** The cell codes of one reading, sorted; kept, so a reading allocates nothing. */
const codes = new Float32Array(METER.width * METER.height);

/**
 * The level of the highlights in stops from the bytes of the meter image (16 bits per cell in its red and green
 * bytes): the mean of the brightest quarter of the cells.
 */
export function meteredStops(pixels: ArrayLike<number>): number {
  const cells = Math.min(Math.floor(pixels.length / 4), codes.length);
  if (cells === 0) return METER.low;
  codes.fill(0);
  for (let i = 0; i < cells; i++) codes[i] = (pixels[i * 4] ?? 0) * 256 + (pixels[i * 4 + 1] ?? 0);
  codes.sort();
  const count = Math.ceil(cells * HIGHLIGHTS);
  let sum = 0;
  for (let i = codes.length - count; i < codes.length; i++) sum += codes[i] ?? 0;
  return METER.low + ((METER.high - METER.low) * sum) / (count * 65535);
}

/** The exposure change the camera wants for a scene level, in stops: 0 inside the band, bounded outside it. */
export function exposureStops(scene: number): number {
  if (!Number.isFinite(scene)) return 0;
  if (scene > SHOW_BAND.high) return -Math.min((scene - SHOW_BAND.high) * FOLLOW, EXPOSURE_RANGE.down);
  if (scene < SHOW_BAND.low) return Math.min((SHOW_BAND.low - scene) * FOLLOW, EXPOSURE_RANGE.up);
  return 0;
}

/**
 * True when the show clock moved by `step` seconds as a running show does. When it stands still or jumps, the
 * exposure is the settled value of the frame, a function of that frame alone: under the test clock (`?test`, which
 * freezes time and steps it) every run then draws the same picture, whatever frames were drawn before.
 */
export function isRunning(step: number): boolean {
  return step > 0 && step < MAX_STEP;
}

/** Moves the exposure toward its target over `seconds` of a running show; with no earlier value it is the target. */
export function adaptStops(current: number | undefined, target: number, seconds: number): number {
  if (current === undefined || !(seconds > 0)) return target;
  return current + (target - current) * (1 - Math.exp(-seconds / ADAPT_SECONDS));
}

/** The tone mapping exposure for a change in stops from the base exposure of the MVR chain. */
export function exposureOf(stops: number): number {
  return MVR_EXPOSURE * Math.pow(2, stops);
}
