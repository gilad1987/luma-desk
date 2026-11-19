import { emitters } from './emitters';
import { toBufferUnits } from './mvrTone';

/**
 * The highest radiance of a lens in the HDR model, in exposure-adjusted units where the bloom threshold is 1. The
 * physical luminance of a lens has no place in a half float target (`lensLuminance` of the photometry core takes a
 * cap for that reason). At the linear 32 a fixture that points into the camera was a flat white patch, wider than
 * its own body, in the On Stage view of a real file; at 12 the lens is still white-hot and three times over the
 * end of the bloom knee, and the bloom around it is a halo that leaves the fixture in view.
 */
export const LENS_CAP = 12;

/**
 * The gain of a lens or pixel strip whose brightest colour channel times its dimmer is `peak` (0..1), bounded so
 * that `peak * gain` never passes `LENS_CAP`: cap * (1 - exp(-linear / cap)). A dim lens keeps the linear gain,
 * so its bloom still follows the dimmer; near full the value bends to the cap. One factor for all channels keeps
 * the hue. The legacy model returns `gain` itself, so a built-in stage does not change by one bit.
 */
export function boundedLensGain(gain: number, peak: number): number {
  if (!emitters.isHdr || !(peak > 0)) return gain;
  const cap = toBufferUnits(LENS_CAP);
  return (cap * (1 - Math.exp((-peak * gain) / cap))) / peak;
}
