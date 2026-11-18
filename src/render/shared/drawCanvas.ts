/** Paints a canvas; it gets the size so one painter can serve several resolutions (gobo masks, icons). */
export type CanvasPainter = (context: CanvasRenderingContext2D, width: number, height: number) => void;

/**
 * Creates a canvas of the given size and paints it. Every procedural texture (deck, floor, stone, logo, gobo, glow,
 * lens faces, fixture panels) starts this way; the painter runs before any texture exists, so its `Math.random`
 * calls stay ahead of the texture's uuid as they did before the refactor.
 */
export function drawCanvas(width: number, height: number, paint: CanvasPainter): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('drawCanvas: this browser gives no 2D canvas context');
  paint(context, width, height);
  return canvas;
}
