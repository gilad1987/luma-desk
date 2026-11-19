import { clamp } from '../../core';
import { finiteOr } from './finite';
import type { LinearRgb } from './srgb';

/**
 * The sRGB transfer function, linear light to the encoded value: 12.92 c below 0.0031308, else
 * 1.055 c^(1 / 2.4) - 0.055. Source: IEC 61966-2-1.
 *
 * @param value linear light, limited to 0..1 (1 = display white); NaN reads as 0
 * @returns the encoded value, 0..1
 */
export function linearToSrgb(value: number): number {
  const c = clamp(Number.isNaN(value) ? 0 : value, 0, 1);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/**
 * The colour scaled so its largest channel is 1: the most saturated display colour of the same chromaticity. A swatch
 * of a lamp colour uses it; the renderer does not (it keeps the real luminance). Black stays black. A channel that
 * is not finite reads as 0 (see `finiteOr`).
 */
export function peakNormalise(rgb: LinearRgb): LinearRgb {
  const [r, g, b] = [finiteOr(rgb[0], 0), finiteOr(rgb[1], 0), finiteOr(rgb[2], 0)];
  const peak = Math.max(r, g, b);
  return peak > 0 ? [r / peak, g / peak, b / peak] : [0, 0, 0];
}

/** Linear sRGB to 8-bit sRGB, each channel 0..255. Channels outside 0..1 clip. */
export function toSrgb8(rgb: LinearRgb): readonly [r: number, g: number, b: number] {
  const encode = (value: number): number => Math.round(255 * linearToSrgb(value));
  return [encode(rgb[0]), encode(rgb[1]), encode(rgb[2])];
}
