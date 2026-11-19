/**
 * The audience material and its hook for other passes. A pass that draws the scene with an override material (depth,
 * normals, albedo for surface lighting) must see the same turned heads and the same colours as the lit picture, so
 * the vertex code has to fit every three.js material, and the audience must not glow.
 */
import { MeshBasicMaterial, MeshDepthMaterial, MeshNormalMaterial, ShaderLib } from 'three';
import { expect, it } from 'vitest';
import {
  audienceMaterial,
  audiencePass,
  audienceVertexShader,
} from '../../../../../src/render/venue/audience/audienceShader.ts';

const uniforms = { uTime: { value: 0 } };

it('is a matte opaque standard material with no emissive', () => {
  const material = audienceMaterial(uniforms);
  expect([material.emissive.getHex(), material.transparent, material.metalness, material.type]).toEqual([
    0,
    false,
    0,
    'MeshStandardMaterial',
  ]);
});

it.each(['standard', 'normal', 'basic', 'depth'] as const)('fits the vertex shader of the %s material', (name) => {
  const source = ShaderLib[name].vertexShader;
  const patched = audienceVertexShader(source);
  expect(patched).toContain('audienceTurn(transformed - aHead.xyz)');
  expect(patched.indexOf('audienceTurn(transformed')).toBeGreaterThan(patched.indexOf('#include <begin_vertex>'));
  // Turned heads need turned normals wherever the material reads normals, and the figure's colours wherever it
  // reads vertex colours: the lit material and a normal pass must have the first, the lit one and albedo the second.
  expect(patched.includes('audienceTurn(objectNormal)')).toBe(source.includes('#include <beginnormal_vertex>'));
  expect(patched.includes('uSkin[int(aLook.x + 0.5)]')).toBe(source.includes('#include <color_vertex>'));
  if (name === 'standard' || name === 'normal') expect(patched).toContain('audienceTurn(objectNormal)');
  if (name === 'standard' || name === 'basic') expect(patched).toContain('uSkin[int(aLook.x + 0.5)]');
});

it('makes one patched clone per override material', () => {
  const [normals, depth] = [new MeshNormalMaterial(), new MeshDepthMaterial()];
  const first = audiencePass(normals, uniforms);
  expect([first === normals, first.type, audiencePass(normals, uniforms) === first]).toEqual([
    false,
    'MeshNormalMaterial',
    true,
  ]);
  expect(audiencePass(depth, uniforms)).not.toBe(first);
  expect(first.customProgramCacheKey()).not.toBe(new MeshBasicMaterial().customProgramCacheKey());
});
