import { toBufferUnits } from '../../post/mvrTone';

/** The wall level a new stage starts at, per cent: a concert runs its walls at 10 to 30 % so the lighting reads. */
export const LED_DEFAULT_PERCENT = 25;

/**
 * Radiance of a full white wall at 100 %, in exposure-adjusted units where the bloom threshold is 1. A fixture lens
 * at full is 32 (`LENS_PEAK`): a wall is a far dimmer source than a lens and far brighter than lit scenery, so 7
 * gives a clearly bright wall with a gentle bloom, and 25 % is at 1.75, at the low end of the bloom knee.
 */
export const LED_WHITE_PEAK = 7;

/** Radiance of white content at `percent` in the units of the HDR scene buffer; linear, as a wall's own level is. */
export function ledRadiance(percent: number): number {
  const level = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0)) / 100;
  return toBufferUnits(LED_WHITE_PEAK * level);
}
