import type { Strip } from './stripReader';
import type { TilePlan } from './tilePlan';

/** The canvas limits of desktop Chrome and Safari (Firefox allows more): 16384 px a side, 16384^2 px in all. */
export const CANVAS_MAX_SIDE = 16384;
export const CANVAS_MAX_AREA = 16384 * 16384;

/** One PNG file of the result; `x`, `y` place it in the output image. */
export interface StillPart {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly blob: Blob;
}

/**
 * The encoded still: one PNG when the browser can hold the whole image in a canvas, else one PNG per tile and a
 * JSON manifest that says where each goes. 8-bit sRGB in both cases.
 */
export interface StillOutput {
  readonly width: number;
  readonly height: number;
  readonly parts: readonly StillPart[];
  readonly manifest: string | null;
}

type Canvas2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
interface Page {
  readonly x: number;
  readonly y: number;
  readonly context: Canvas2D;
}

function createPage(x: number, y: number, width: number, height: number): Page {
  // OffscreenCanvas when there is one (no DOM node, works in a worker later); a canvas element otherwise
  const canvas =
    typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(width, height) : document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error(`the browser could not make a ${width} x ${height} canvas`);
  return { x, y, context };
}

async function toPng(context: Canvas2D): Promise<Blob> {
  const { canvas } = context;
  if (canvas instanceof HTMLCanvasElement) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('the browser could not encode the PNG'))));
    });
  }
  return canvas.convertToBlob({ type: 'image/png' });
}

export const fitsOneCanvas = (width: number, height: number): boolean =>
  width <= CANVAS_MAX_SIDE && height <= CANVAS_MAX_SIDE && width * height <= CANVAS_MAX_AREA;

/** Collects the read-back strips into one canvas (or one per tile) and encodes them to PNG at the end. */
export class PngOutput {
  private readonly pages: Page[];
  private readonly plan: TilePlan;

  constructor(plan: TilePlan) {
    this.plan = plan;
    const whole = fitsOneCanvas(plan.width, plan.height);
    this.pages = whole
      ? [createPage(0, 0, plan.width, plan.height)]
      : plan.tiles.map((t) => createPage(t.x, t.y, t.width, t.height));
  }

  /** Puts a strip into every page it crosses; the dirty rectangle clips it, so no strip is copied again. */
  put(strip: Strip): void {
    const image = new ImageData(strip.pixels, this.plan.width, strip.rows);
    for (const { x, y, context } of this.pages) {
      const top = Math.max(y, strip.y);
      const bottom = Math.min(y + context.canvas.height, strip.y + strip.rows);
      if (top >= bottom) continue;
      context.putImageData(image, -x, strip.y - y, x, top - strip.y, context.canvas.width, bottom - top);
    }
  }

  async encode(): Promise<StillOutput> {
    const { width, height } = this.plan;
    const single = this.pages.length === 1;
    const parts = await Promise.all(
      this.pages.map(async ({ x, y, context }, i) => {
        const { width: w, height: h } = context.canvas;
        const name = single ? 'still.png' : `still-tile-${i}.png`;
        return { name, x, y, width: w, height: h, blob: await toPng(context) };
      }),
    );
    const files = parts.map(({ name, x, y, width: w, height: h }) => ({ name, x, y, width: w, height: h }));
    return { width, height, parts, manifest: single ? null : JSON.stringify({ width, height, files }) };
  }
}
