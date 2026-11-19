import { FloatType, HalfFloatType } from 'three';
import type { TextureDataType } from 'three';

/** The WebGL2 extensions the accumulation formats depend on. */
export interface FloatCaps {
  /** EXT_color_buffer_float: a float texture can be a render target at all (16F and 32F). */
  readonly colorBufferFloat: boolean;
  /** EXT_float_blend: a 32F target can blend; without it an additive draw to 32F is an error. */
  readonly floatBlend: boolean;
  /** OES_texture_float_linear: linear filtering of 32F. Recorded only: every still pass reads with texelFetch. */
  readonly floatLinear: boolean;
}

/**
 * How the samples of a tile are combined.
 * - `sum`: RGBA32F holds the plain sum (alpha counts the valid samples). A 24-bit mantissa keeps 256 samples of the
 *   largest half-float value (65504) to a relative error under 2e-5, so the sum is stable for every preset.
 * - `mean`: RGBA16F holds a running mean, m(n) = m(n-1) + (x - m(n-1)) / n, through constant blending with weight
 *   1/n; alpha is the running share of valid samples, so rgb / alpha is the mean of the valid ones.
 *   A 16F SUM would round away each new sample once it passes 2048 times the sample size; a mean stays at the
 *   sample's own scale, so each step only loses the half-float rounding of that step (at most 2^-11 of the value).
 *   Step n's rounding still weighs n / N in the final mean. Roundings of varying samples have random signs and
 *   mostly cancel: after 256 samples the mean has up to about 1 % error (typically 0.2 %). Only if every rounding
 *   went the same way would it reach the strict bound of 6 %.
 */
export interface AccumFormat {
  readonly mode: 'sum' | 'mean';
  readonly type: TextureDataType;
}

/** Reads the capabilities; `has` is `renderer.extensions.has`, which also enables the extension it finds. */
export function readFloatCaps(has: (name: string) => boolean): FloatCaps {
  return {
    colorBufferFloat: has('EXT_color_buffer_float'),
    floatBlend: has('EXT_float_blend'),
    floatLinear: has('OES_texture_float_linear'),
  };
}

/** Picks the accumulation format, or throws the reason the GPU cannot render a still. */
export function chooseAccumFormat(caps: FloatCaps): AccumFormat {
  if (!caps.colorBufferFloat) throw new Error('this GPU cannot render to float targets (no EXT_color_buffer_float)');
  return caps.floatBlend ? { mode: 'sum', type: FloatType } : { mode: 'mean', type: HalfFloatType };
}
