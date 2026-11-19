import { ConstantAlphaFactor, NoBlending, OneFactor, OneMinusConstantAlphaFactor } from 'three';
import type { ShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { createStillMaterials, setAccumulateBlend } from '../../../../src/render/still/stillMaterials';

type Rgba = [number, number, number, number];

/** The GL blend factor value the accumulation uses; any other factor is a test failure. */
function factor(material: ShaderMaterial, f: number | null): number {
  if (f === OneFactor) return 1;
  if (f === ConstantAlphaFactor) return material.blendAlpha;
  if (f === OneMinusConstantAlphaFactor) return 1 - material.blendAlpha;
  throw new Error(`unexpected blend factor ${f}`);
}

/** One texel through the accumulation as the GPU runs it: the shader's output, then the material's blend. */
function accumulate(material: ShaderMaterial, dst: Rgba, x: number): Rgba {
  const src: Rgba = Number.isFinite(x) ? [x, x, x, 1] : [0, 0, 0, 0];
  if (material.blending === NoBlending) return src;
  const [s, d] = [factor(material, material.blendSrc), factor(material, material.blendDst)];
  const [sa, da] = [factor(material, material.blendSrcAlpha), factor(material, material.blendDstAlpha)];
  return [src[0] * s + dst[0] * d, src[1] * s + dst[1] * d, src[2] * s + dst[2] * d, src[3] * sa + dst[3] * da];
}

/** The resolve's `validMean`: rgb over the valid count (or share), 0 when no sample was valid. */
const validMean = ([r, , , a]: Rgba): number => (a > 0 ? r / a : 0);

function run(samples: number[], isMean: boolean): number {
  const { accumulate: material } = createStillMaterials();
  let texel: Rgba = [7, 7, 7, 7];
  samples.forEach((x, n) => {
    setAccumulateBlend(material, n, isMean);
    texel = accumulate(material, texel, x);
  });
  return validMean(texel);
}

describe('still accumulation with bad samples', () => {
  for (const isMean of [false, true]) {
    const mode = isMean ? 'running mean' : 'sum';
    it(`divides by the valid samples only (${mode})`, () => {
      expect(run([1, NaN, 3, Infinity, 2], isMean)).toBeCloseTo(2, 12);
      expect(run([NaN, 4], isMean)).toBeCloseTo(4, 12);
      expect(run([0.5, 0.25, 0.75, 0.5], isMean)).toBeCloseTo(0.5, 12);
    });
    it(`gives 0 for a pixel with no valid sample (${mode})`, () => {
      expect(run([NaN, -Infinity, NaN], isMean)).toBe(0);
    });
  }

  it('writes validity into alpha and divides by it in the resolve and the probe', () => {
    const { accumulate: acc, resolve, probe } = createStillMaterials();
    expect(acc.fragmentShader).toContain('bad ? vec4(0.0) : vec4(clamp(c.rgb, 0.0, 65504.0), 1.0)');
    expect(Object.keys(acc.uniforms)).toEqual(['map']);
    for (const pass of [resolve, probe]) {
      expect(pass.fragmentShader).toContain('s.a > 0.0 ? s.rgb / s.a : vec3(0.0)');
      expect(pass.fragmentShader).toContain('validMean(texelFetch(');
      expect(Object.keys(pass.uniforms)).not.toContain('scale');
    }
  });
});
