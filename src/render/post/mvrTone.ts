import { ACESFilmicToneMapping, type ToneMapping } from 'three';

/**
 * The one tone path of the MVR chain, for both Glow states. ACES Filmic keeps the saturation of the beams. AgX
 * (three.js 0.160, which has no AgX look) was compared on a real MVR with beams on: it gave about a quarter less
 * saturation and a flat, grey image. Neither clips the middle of crossing beams to white in this chain.
 */
export const MVR_TONE_MAPPING: ToneMapping = ACESFilmicToneMapping;

/** Fixed manual exposure: an auto exposure would lift a blackout to grey. */
export const MVR_EXPOSURE = 1.2;

/**
 * Bloom values in exposure-adjusted linear units (scene radiance times `MVR_EXPOSURE`), so 1 is the white of a lit
 * surface. Radiance below `threshold` gives no bloom; the knee fades the bloom in up to `threshold + knee`, so a
 * bright wall or a beam blooms a little and only a real emitter blooms in full.
 */
export const BLOOM = { threshold: 1, knee: 3, strength: 0.3, radius: 0.5 } as const;

/** Converts an exposure-adjusted value to the units of the HDR scene buffer, which holds radiance before exposure. */
export function toBufferUnits(exposureAdjusted: number): number {
  return exposureAdjusted / MVR_EXPOSURE;
}
