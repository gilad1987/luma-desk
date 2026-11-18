import type { Rgb01 } from '../../../core';
import { lensGain } from '../../post/emitters';
import type { LightVisual } from '../FixtureVisual';

/**
 * Tints the lens face and the LED pixel strip by colour and intensity. It runs for dark fixtures too, so a lens
 * falls back to its faint unlit grey; that is why it does not take the lit-only `BeamFrame`. The gains are the
 * legacy 3 and 2.2 on a built-in stage; the MVR chain makes the lens an HDR emitter (see `lensGain`).
 */
export function syncLens(v: LightVisual, col: Rgb01, intensity: number): void {
  const lens = lensGain(3),
    pix = lensGain(2.2);
  v.lensMat.color.setRGB(
    0.03 + col[0] * intensity * lens,
    0.03 + col[1] * intensity * lens,
    0.03 + col[2] * intensity * lens,
  );
  if (v.pix)
    v.pix.material.color.setRGB(
      0.02 + col[0] * intensity * pix,
      0.02 + col[1] * intensity * pix,
      0.02 + col[2] * intensity * pix,
    );
}
