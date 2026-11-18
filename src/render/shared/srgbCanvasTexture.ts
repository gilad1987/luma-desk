import { SRGBColorSpace, type CanvasTexture, type Wrapping } from 'three';
import { createCanvasTexture } from './createCanvasTexture';
import { drawCanvas } from './drawCanvas';
import type { CanvasPainter } from './drawCanvas';

/**
 * A painted colour image (fixture panels, lens faces, haze puffs, monitor screens, the drum logo, venue stone): sRGB,
 * as the painter's CSS colours are. `wrap` is for tiled surfaces; without it three's default clamp stays.
 */
export function srgbCanvasTexture(width: number, height: number, paint: CanvasPainter, wrap?: Wrapping): CanvasTexture {
  return createCanvasTexture(drawCanvas(width, height, paint), {
    colorSpace: SRGBColorSpace,
    ...(wrap === undefined ? {} : { wrap }),
  });
}
