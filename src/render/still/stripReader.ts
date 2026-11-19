import type { WebGLRenderer, WebGLRenderTarget } from 'three';

/** Rows per read-back: 8 MB of RGBA8 at 8K, so the CPU never holds a second full copy of the image. */
export const STRIP_ROWS = 256;

/**
 * WebGL rows run bottom-up, image rows top-down: copies `rows` rows of `width` px from `bottomUp` in reverse order
 * into `out`, and sets alpha to 255 (a still is opaque; a canvas would otherwise premultiply a stray alpha).
 */
export function flipRows(bottomUp: Uint8Array, out: Uint8ClampedArray, width: number, rows: number): void {
  const stride = width * 4;
  for (let row = 0; row < rows; row++) {
    const from = (rows - 1 - row) * stride;
    out.set(bottomUp.subarray(from, from + stride), row * stride);
  }
  for (let i = 3; i < rows * stride; i += 4) out[i] = 255;
}

/** One strip of the image, top-down: `rows` rows starting at image row `y`. */
export interface Strip {
  readonly pixels: Uint8ClampedArray<ArrayBuffer>;
  readonly y: number;
  readonly rows: number;
}

/** Reads an RGBA8 target strip by strip from the top, one strip per call, so each call fits in a frame budget. */
export class StripReader {
  private y = 0;
  private readonly raw: Uint8Array;
  private readonly flipped: Uint8ClampedArray<ArrayBuffer>;
  private readonly renderer: WebGLRenderer;
  private readonly target: WebGLRenderTarget;
  private readonly onStrip: (strip: Strip) => void;

  constructor(renderer: WebGLRenderer, target: WebGLRenderTarget, onStrip: (strip: Strip) => void) {
    this.renderer = renderer;
    this.target = target;
    this.onStrip = onStrip;
    const size = target.width * Math.min(STRIP_ROWS, target.height) * 4;
    this.raw = new Uint8Array(size);
    this.flipped = new Uint8ClampedArray(size);
  }

  /** Reads the next strip; true when the last one is read. */
  readNext(): boolean {
    const { width, height } = this.target;
    if (this.y >= height) return true;
    const rows = Math.min(STRIP_ROWS, height - this.y);
    const count = width * rows * 4;
    const raw = this.raw.subarray(0, count);
    // the strip's lowest image row is the WebGL row `height - y - rows`
    this.renderer.readRenderTargetPixels(this.target, 0, height - this.y - rows, width, rows, raw);
    const pixels = this.flipped.subarray(0, count);
    flipRows(raw, pixels, width, rows);
    this.onStrip({ pixels, y: this.y, rows });
    this.y += rows;
    return this.y >= height;
  }
}
