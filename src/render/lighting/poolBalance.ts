import { surfaceLight } from './surfaceLight';
import { NEUTRAL_ALBEDO, SURFACE_GAIN } from './surfacePhotometry';

/**
 * The scale of the floor pools and the stand-in lights of an imported stage (Real light off). The first look sets
 * its levels for the surface light, which takes the base colour of the deck, the facing and the shadows off each
 * beam. A pool is a decal: it adds its full colour whatever the deck is, so at the same levels the deck of a real
 * file was white-hot. With 0.2 the pool of a key (1.5 m radius) on a mid-grey deck is a little under its surface
 * light (`poolOverSurface` 0.61), judged on the FOH and On Stage views against the picture with Real light on:
 * at 0.3 the deck of the fallback was still the brightest thing in the frame, as many pools lie on each other.
 */
export const MVR_POOL_GAIN = 0.2;

/**
 * The pool scale of an imported stage for this frame. The gain is for the pools that stand in for a surface light
 * the user turned off (Real light off on a stage that has it or waits for it, `surfaceLight.isAwaited`). A stage
 * that never gets the surface light (no scenery, a post chain that did not load) has only the decals on its floor,
 * and its levels were never set against that light: its pools keep 1, as on a built-in stage.
 */
export function mvrPoolGain(): number {
  return surfaceLight.isAwaited() && !surfaceLight.isEnabled ? MVR_POOL_GAIN : 1;
}

/** The colour scale of a pool decal of `radius` metres for this output (dimmer times type power). */
export function decalRadiance(output: number, radius: number): number {
  return (output * 0.3) / (1 + radius * 0.1);
}

/**
 * The radiance of an imported stage's pool decal over that of the surface light of the same beam, on a deck of
 * base colour `albedo`. The surface light spreads one unit of output over the pool (1 / (pi r^2) at the peak); the
 * decal does not, so the ratio grows with the pool.
 */
export function poolOverSurface(radius: number, albedo = NEUTRAL_ALBEDO): number {
  const surface = (SURFACE_GAIN * albedo) / (Math.PI * radius * radius);
  return (MVR_POOL_GAIN * decalRadiance(1, radius)) / surface;
}
