import {
  ConstantAlphaFactor,
  CustomBlending,
  NearestFilter,
  NoBlending,
  OneFactor,
  OneMinusConstantAlphaFactor,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import type { TextureDataType } from 'three';
import { PROBE_HEIGHT, PROBE_WIDTH } from './stopRule';

const VERTEX = 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }';

/**
 * Adds one sample to the tile sum. A NaN or infinite sample becomes 0: one bad pixel would otherwise poison the sum
 * for the rest of the tile. Alpha is the sample's validity (1 or 0), so the bad sample also leaves the divisor and
 * does not darken the pixel.
 */
const ACCUMULATE = `
uniform highp sampler2D map;
void main() {
  vec4 c = texelFetch(map, ivec2(gl_FragCoord.xy), 0);
  bool bad = any(isnan(c.rgb)) || any(isinf(c.rgb));
  gl_FragColor = bad ? vec4(0.0) : vec4(clamp(c.rgb, 0.0, 65504.0), 1.0);
}`;

/** The mean of the valid samples in a tile texel: rgb over alpha (see `setAccumulateBlend`); 0 when none is valid. */
const VALID_MEAN = 'vec3 validMean(vec4 s) { return s.a > 0.0 ? s.rgb / s.a : vec3(0.0); }';

/** Writes the valid mean into the full image; `origin` is the tile's place there (the viewport covers the tile). */
const RESOLVE = `
uniform highp sampler2D map;
uniform vec2 origin;
${VALID_MEAN}
void main() {
  gl_FragColor = vec4(validMean(texelFetch(map, ivec2(gl_FragCoord.xy - origin), 0)), 1.0);
}`;

/**
 * The stop rule's probe: a 4 x 4 stratified box mean of the tile per probe pixel, then a fixed tone curve
 * (Reinhard, gamma 2.2). The curve is a stand-in for the source's tone mapping, which the core does not know; the
 * rule measures how much the picture still changes, and any fixed display-like curve ranks that change the same.
 */
const PROBE = `
uniform highp sampler2D map;
uniform vec2 tileSize;
${VALID_MEAN}
void main() {
  vec2 cell = tileSize / vec2(${PROBE_WIDTH}.0, ${PROBE_HEIGHT}.0);
  vec2 start = floor(gl_FragCoord.xy - 0.5) * cell;
  vec3 sum = vec3(0.0);
  for (int j = 0; j < 4; j++) {
    for (int i = 0; i < 4; i++) {
      vec2 p = min(start + (vec2(i, j) + 0.5) * cell / 4.0, tileSize - 1.0);
      sum += validMean(texelFetch(map, ivec2(p), 0));
    }
  }
  vec3 mean = sum / 16.0;
  gl_FragColor = vec4(pow(mean / (1.0 + mean), vec3(1.0 / 2.2)), 1.0);
}`;

const material = (fragmentShader: string, uniforms: ShaderMaterial['uniforms']): ShaderMaterial =>
  new ShaderMaterial({ vertexShader: VERTEX, fragmentShader, uniforms, depthTest: false, depthWrite: false });

/** The three full-screen materials of the accumulation; blending is set per draw by `Accumulator`. */
export function createStillMaterials(): { accumulate: ShaderMaterial; resolve: ShaderMaterial; probe: ShaderMaterial } {
  return {
    accumulate: material(ACCUMULATE, { map: { value: null } }),
    resolve: material(RESOLVE, { map: { value: null }, origin: { value: new Vector2() } }),
    probe: material(PROBE, { map: { value: null }, tileSize: { value: new Vector2() } }),
  };
}

/**
 * The blend for sample `sample` (0-based); sample 0 replaces, so no clear is needed. A sum adds (one, one) in every
 * channel, so alpha counts the valid samples. A running mean mixes every channel by the constant weight 1/n: rgb
 * becomes the mean of the samples with bad ones as 0 and alpha the share of valid samples, so rgb / alpha is the
 * same mean of the valid samples as the sum gives. The weight is a blend constant, as alpha now carries validity.
 */
export function setAccumulateBlend(accumulate: ShaderMaterial, sample: number, isMean: boolean): void {
  accumulate.blending = sample === 0 ? NoBlending : CustomBlending;
  accumulate.blendSrc = isMean ? ConstantAlphaFactor : OneFactor;
  accumulate.blendDst = isMean ? OneMinusConstantAlphaFactor : OneFactor;
  accumulate.blendSrcAlpha = accumulate.blendSrc;
  accumulate.blendDstAlpha = accumulate.blendDst;
  accumulate.blendAlpha = 1 / (sample + 1);
}

/** A still target: nearest filtering, because every pass reads exact texels (no OES_texture_float_linear needed). */
export const stillTarget = (
  width: number,
  height: number,
  type: TextureDataType,
  depthBuffer = false,
): WebGLRenderTarget =>
  new WebGLRenderTarget(width, height, { type, depthBuffer, minFilter: NearestFilter, magFilter: NearestFilter });
