import { clamp } from '../../core';
import { DEFAULT_ALBEDO } from '../photometry';

/** Lens radius in metres for a fixture whose body has no lens to measure. */
export const DEFAULT_LENS_RADIUS = 0.08;
/** The narrowest field half angle the volume draws (0.5 degrees), as a tangent; below it the cone has no width. */
export const MIN_TAN = Math.tan(Math.PI / 360);
/** How much the drifting haze noise changes the density, as a fraction of it: a well-mixed haze is nearly even. */
export const HAZE_NOISE = 0.22;

/** Haze density (extinction per metre) at the full HAZE control: a thick show haze. */
const FULL_DENSITY = 0.03;
/** The curve of the control: 30 gives about 0.002 /m (a thin haze), the default 62 about 0.01 /m. */
const DENSITY_CURVE = 2.3;
/** The density with the hazer off: the air of a venue is never clean, so a strong beam leaves a trace. */
const CLEAN_AIR = 0.0003;
/**
 * How many times brighter the haze is drawn than a physical haze of its density. A real shaft is a few per cent of
 * the pool it makes, which no screen shows, so a visualiser lifts the haze. At 14 (the earlier gain of 10) one
 * 25 degree wash at 60 % showed 72 % of its own pool from the side, five crossing washes were brighter than the
 * deck in the key, and the air between the shafts was a milky veil. At 6 that shaft is 26 % of its pool, a 4 degree
 * beam is still a clear shaft, and twenty crossing washes stay under a white surface in the key.
 */
export const HAZE_LIFT = 6;
/**
 * Scene brightness per unit of density, beam intensity and inverse-square path: single scattering is density x
 * albedo x phase x intensity x path, with the phase normalised to 1 / (4 pi) (`hazePhase.ts` holds it times 4 pi).
 * A white surface shows `SURFACE_GAIN` (3) times its irradiance where the physical value is 1 / pi, so the scene
 * is 3 pi times physical and the physical gain is 3 pi x albedo / (4 pi) = 0.75 x 0.95.
 */
const SCATTER_GAIN = HAZE_LIFT * 0.75 * DEFAULT_ALBEDO;
/**
 * The share of the density that takes light off a path. Haze does not absorb: most of the scattered light goes on
 * nearly forward and still arrives, so a single-scatter loss at the full density would turn a thick haze dark from
 * 100 m (the Wide view), where a real one turns milky.
 */
const PATH_LOSS = 0.2;
/** Metres of shaft per unit of side-view brightness; past it a wide wash adds nothing a viewer can see. */
const REACH = 25;

/**
 * The peak intensity of one unit of output in a cone with this field half angle: output over the solid angle of the
 * cone. So a 3 degree beam is far brighter per unit of haze than a 40 degree wash of the same output.
 */
export function peakIntensity(tanHalf: number): number {
  const tan = Math.max(tanHalf, MIN_TAN);
  return 1 / (2 * Math.PI * (1 - 1 / Math.sqrt(1 + tan * tan)));
}

/**
 * How far the volume of a beam is drawn: the brightness of a shaft seen from the side falls with 1 / distance, and
 * a wide wash is below what the eye sees after a few metres. The cut keeps a 120 degree blinder from a cone that
 * covers the whole frame for no light.
 */
export function reachOf(tanHalf: number): number {
  const tan = Math.max(tanHalf, MIN_TAN);
  return REACH * peakIntensity(tan) * 2 * Math.atan(tan);
}

/**
 * Where the full-brightness core ends, as a fraction of the field radius, from the edge softness of the fixture
 * type (about 1.3 for a hard spot, 3 for a soft wash).
 */
export function innerFraction(soft: number): number {
  return clamp(1.1 - 0.28 * soft, 0.2, 0.85);
}

/** The one haze density of the hall, per metre, for the HAZE control (0..1). */
export function hazeDensity(haze: number): number {
  return CLEAN_AIR + (FULL_DENSITY - CLEAN_AIR) * Math.pow(clamp(haze, 0, 1), DENSITY_CURVE);
}

/** Scattering for the HAZE control (0..1), in the units of the HDR scene target: proportional to the density. */
export function hazeScatter(haze: number): number {
  return SCATTER_GAIN * hazeDensity(haze);
}

/** The loss per metre of path for the HAZE control (0..1). */
export function hazeExtinction(haze: number): number {
  return PATH_LOSS * hazeDensity(haze);
}

/** Samples per view ray: fewer when many beams are lit, so the pass keeps its frame budget. */
export function stepsFor(count: number): number {
  if (count <= 100) return 14;
  return count <= 300 ? 10 : 8;
}
