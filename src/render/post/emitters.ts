import { toBufferUnits } from './mvrTone';

/**
 * Which emitter model the fixture sync uses. The MVR chain turns the HDR model on while it draws; the built-in
 * chain keeps the legacy values bit for bit. It is module state because the sync functions get no render context.
 */
export const emitters = { isHdr: false };

/**
 * Radiance of a full white lens in the HDR model, in exposure-adjusted units where the bloom threshold is 1, before
 * the bound of `lensBound`: the linear law of a dim lens, so a lens at 5 % is at 1.6, at the low end of the bloom knee.
 */
export const LENS_PEAK = 32;

/** The lens gain of the legacy model; the other legacy gains (the pixel strip) keep their ratio to it. */
const LEGACY_LENS_GAIN = 3;

/** The flare sprite is a drawn halo; in the HDR model the bloom makes the halo, so the sprite keeps a quarter. */
export const HDR_FLARE_GAIN = 0.25;

/**
 * The factor from colour times dimmer to lens radiance. Radiance stays linear in the dimmer, so the bloom follows
 * the emitted energy. The legacy model returns `legacyGain` itself, so its products do not change by one bit.
 */
export function lensGain(legacyGain: number): number {
  return emitters.isHdr ? (legacyGain / LEGACY_LENS_GAIN) * toBufferUnits(LENS_PEAK) : legacyGain;
}

/** The factor on the flare sprite; 1 in the legacy model, which is an exact multiply. */
export function flareGain(): number {
  return emitters.isHdr ? HDR_FLARE_GAIN : 1;
}
