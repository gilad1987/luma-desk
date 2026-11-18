import type { RgbaImage } from '../../shared';
import { fromOklab, level, toLinear, toOklab, type Rgb } from './oklabPair';

// Edits that model a real render change (exposure, white balance, a dimmed lamp) or a harmless one (noise). Each one
// is built in code from an image; gateImages.ts draws and moves lines.
export type { Rgb } from './oklabPair';

/** Maps every pixel's RGB through `edit`; alpha stays. */
function mapPixels(src: RgbaImage, edit: (rgb: Rgb, p: number) => Rgb): RgbaImage {
  const data = new Uint8Array(src.data);
  for (let p = 0; p < src.width * src.height; p++) {
    data.set(edit([data[p * 4] ?? 0, data[p * 4 + 1] ?? 0, data[p * 4 + 2] ?? 0], p), p * 4);
  }
  return { ...src, data };
}

const each = ([r, g, b]: Rgb, f: (v: number) => number): Rgb => [f(r), f(g), f(b)];
const gained = (rgb: Rgb, gain: number): Rgb => each(rgb, (v) => level(toLinear(v / 255) * gain));

/** Every pixel's linear light times `gain`, as an exposure change would (bright pixels clip at 255). */
export const exposed = (src: RgbaImage, gain: number): RgbaImage => mapPixels(src, (rgb) => gained(rgb, gain));

/** Every pixel's hue turned by `degrees` in the Oklab a-b plane, at the same lightness and chroma. */
export function hueTurned(src: RgbaImage, degrees: number): RgbaImage {
  const [cos, sin] = [Math.cos((degrees * Math.PI) / 180), Math.sin((degrees * Math.PI) / 180)];
  return mapPixels(src, (rgb) => {
    const [l, a, b] = toOklab(rgb);
    return fromOklab([l, a * cos - b * sin, a * sin + b * cos]);
  });
}

/** Uniform integer noise in [-lsb, lsb] on every channel, from a fixed seed so the test never flakes. */
export function noisy(src: RgbaImage, lsb: number): RgbaImage {
  let seed = 12345;
  const next = (): number => ((seed = (seed * 1103515245 + 12345) >>> 0) >>> 16) % (2 * lsb + 1);
  return mapPixels(src, (rgb) => each(rgb, (v) => Math.max(0, Math.min(255, v + next() - lsb))));
}

export const pixelOf = (src: RgbaImage, x: number, y: number): Rgb => {
  const p = (y * src.width + x) * 4;
  return [src.data[p] ?? 0, src.data[p + 1] ?? 0, src.data[p + 2] ?? 0];
};

/** Oklab lightness summed on a 4 px grid over the square of `side` at (x, y): cheap, and enough to rank squares. */
function squareLightness(src: RgbaImage, x: number, y: number, side: number): number {
  let sum = 0;
  for (let j = 0; j < side; j += 4) for (let i = 0; i < side; i += 4) sum += toOklab(pixelOf(src, x + i, y + j))[0];
  return sum;
}

/** A copy with the brightest square of `area` (a share of the picture) at its linear light times `gain`. */
export function dimmedBrightest(src: RgbaImage, area: number, gain: number): RgbaImage {
  const side = Math.round(Math.sqrt(area * src.width * src.height));
  let [best, bx, by] = [-1, 0, 0];
  for (let y = 0; y + side <= src.height; y += 4) {
    for (let x = 0; x + side <= src.width; x += 4) {
      const sum = squareLightness(src, x, y, side);
      if (sum > best) [best, bx, by] = [sum, x, y];
    }
  }
  return mapPixels(src, (rgb, p) => {
    const [x, y] = [p % src.width, Math.floor(p / src.width)];
    const inside = x >= bx && x < bx + side && y >= by && y < by + side;
    return inside ? gained(rgb, gain) : rgb;
  });
}
