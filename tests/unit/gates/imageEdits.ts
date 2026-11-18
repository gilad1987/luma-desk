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

/**
 * A copy with the brightest `share` of the pixels (ranked by Oklab L) at their linear light times `gain`, as a dimmer
 * lamp would be: lamps on a real stage are spread hot spots, not one square. Every pixel at the cut is included, so
 * ties can take more than `share` (on the synthetic stage every beam pixel has the same L).
 */
export function dimmedBrightestPixels(src: RgbaImage, share: number, gain: number): RgbaImage {
  const n = src.width * src.height;
  const lightness = new Float64Array(n);
  for (let p = 0; p < n; p++) {
    lightness[p] = toOklab([src.data[p * 4] ?? 0, src.data[p * 4 + 1] ?? 0, src.data[p * 4 + 2] ?? 0])[0];
  }
  const cut = Float64Array.from(lightness).sort()[Math.floor(n * (1 - share))] ?? Infinity;
  return mapPixels(src, (rgb, p) => ((lightness[p] ?? 0) >= cut ? gained(rgb, gain) : rgb));
}
