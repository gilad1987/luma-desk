import { SRGBColorSpace, type CanvasTexture } from 'three';
import { createCanvasTexture, drawCanvas, type CanvasPainter } from '../shared';

/** A painted colour image (panels, lens faces, haze puffs, monitor screens): sRGB, as the painter's CSS colours are. */
export function srgbCanvasTexture(width: number, height: number, paint: CanvasPainter): CanvasTexture {
  return createCanvasTexture(drawCanvas(width, height, paint), { colorSpace: SRGBColorSpace });
}
