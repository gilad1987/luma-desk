import type { Rgb01 } from '../../../core';
import type { LightVisual } from '../FixtureVisual';

/**
 * Tints the lens face and the LED pixel strip by colour and intensity. It runs for dark fixtures too, so a lens
 * falls back to its faint unlit grey; that is why it does not take the lit-only `BeamFrame`.
 */
export function syncLens(v: LightVisual, col: Rgb01, intensity: number): void {
  v.lensMat.color.setRGB(0.03 + col[0] * intensity * 3, 0.03 + col[1] * intensity * 3, 0.03 + col[2] * intensity * 3);
  if (v.pix)
    v.pix.material.color.setRGB(
      0.02 + col[0] * intensity * 2.2,
      0.02 + col[1] * intensity * 2.2,
      0.02 + col[2] * intensity * 2.2,
    );
}
