import type { BoxGeometry, Mesh, MeshBasicMaterial } from 'three';

/** A colour in the engine's 0-100 percent channels. */
export interface PercentRgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * Lights the deck-edge LED strip from the screen fixture's colour and intensity `level` (0-1). The factor 2 makes
 * the thin strip read as a glowing edge (its material is not tone mapped).
 */
export function colourLedStrip(strip: Mesh<BoxGeometry, MeshBasicMaterial>, colour: PercentRgb, level: number): void {
  strip.material.color.setRGB((colour.r / 100) * level * 2, (colour.g / 100) * level * 2, (colour.b / 100) * level * 2);
}
