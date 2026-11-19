import type { Rgb01 } from '../../../core';
import { emitters, lensGain } from '../../post/emitters';
import { boundedLensGain } from '../../post/lensBound';
import type { LightVisual } from '../FixtureVisual';
import { shapeLens } from '../lens/shapeLens';

/**
 * Tints the lens face and the LED pixel strip by colour and intensity. It runs for dark fixtures too, so a lens
 * falls back to its faint unlit grey; that is why it does not take the lit-only `BeamFrame`. The gains are the
 * legacy 3 and 2.2 on a built-in stage; the MVR chain makes the lens an HDR emitter (see `lensGain`), bounded so
 * a lens that points into the camera stays a bright lens with a halo (`boundedLensGain`), and bounded again per
 * texel of its face, so the cells of the lens show at any level (`shapeLens`).
 */
export function syncLens(v: LightVisual, col: Rgb01, intensity: number): void {
  const peak = Math.max(col[0], col[1], col[2]) * intensity;
  const lens = boundedLensGain(lensGain(3), peak),
    pix = boundedLensGain(lensGain(2.2), peak);
  v.lensMat.color.setRGB(
    0.03 + col[0] * intensity * lens,
    0.03 + col[1] * intensity * lens,
    0.03 + col[2] * intensity * lens,
  );
  shapeLens(v.lensMat, emitters.isHdr ? peak * lens : 0);
  if (v.pix)
    v.pix.material.color.setRGB(
      0.02 + col[0] * intensity * pix,
      0.02 + col[1] * intensity * pix,
      0.02 + col[2] * intensity * pix,
    );
}
