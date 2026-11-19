import { ditherAt } from '../../../src/render/post/ditherOutput';
import type { RgbaImage } from '../../shared';
import { gamutFitted, level, toLinear, toOklab, type Rgb } from './oklabPair';

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

/**
 * Every pixel's hue turned by `degrees` in the Oklab a-b plane at the same lightness and chroma, as lights of another
 * colour would give. A turned colour outside sRGB keeps its hue and loses only the chroma it must (gamutFitted), so
 * the edit is really turned by `degrees`; the renderer itself clips per channel. The 8-bit write adds the renderer's
 * dither formula (ditherAt of the MVR output pass, imported on purpose: a change of the dither moves these numbers),
 * so the sub-step turn of a dim, near-grey pixel shows as a fine mix of two levels and does not round back. Its rows
 * are not aligned to the shot (the renderer counts from the bottom); flipped, 10° still measures 5.84° or more.
 * Turned by 0°, almost no pixel moves (at most one byte of a baseline): the dither spans half a step either way.
 */
export function hueTurned(src: RgbaImage, degrees: number): RgbaImage {
  const [cos, sin] = [Math.cos((degrees * Math.PI) / 180), Math.sin((degrees * Math.PI) / 180)];
  return mapPixels(src, (rgb, p) => {
    const [l, a, b] = toOklab(rgb);
    const dither = ditherAt(p % src.width, Math.floor(p / src.width)) * 255;
    return each(gamutFitted([l, a * cos - b * sin, a * sin + b * cos]), (v) => level(v, dither));
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
