import type { Page } from '@playwright/test';

/**
 * The drawing-buffer size of the 3D canvas (`canvas#c`), its `width` and `height` attributes. The renderer sets them
 * when its ResizeObserver sees the viewer change size, so they show that the 3D view refitted, not only that the CSS
 * box moved. The specs run at a device scale factor of 1, so they equal the box in CSS pixels.
 */
export function canvasSize(page: Page): Promise<number[]> {
  return page.locator('canvas#c').evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvasSize: #c is not a canvas');
    return [canvas.width, canvas.height];
  });
}
