import { CustomBlending, GLSL3, OneFactor, ShaderMaterial } from 'three';
import type { Texture } from 'three';
import { quadVertexShader, upsampleFragmentShader } from './glsl';
import { createUpsampleUniforms, type VolumeUniforms } from './volumeUniforms';

/** The material that adds the half-resolution beam target `beams` to the scene (see `glsl/upsample.frag.glsl`). */
export function createUpsampleMaterial(volume: VolumeUniforms, beams: Texture): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: createUpsampleUniforms(volume, beams),
    vertexShader: quadVertexShader,
    fragmentShader: upsampleFragmentShader,
    glslVersion: GLSL3,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneFactor,
  });
}
