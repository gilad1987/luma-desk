import type { IUniform, Material } from 'three';
import { crowdBounceParsChunk, crowdBounceVertexChunk } from '../shaders';

/** The crowd bounce inputs: `uBeat` is the beat phase in radians, `uJump` scales every jump (1 = full). */
export interface CrowdBounceUniforms {
  readonly uBeat: IUniform<number>;
  readonly uJump: IUniform<number>;
}

/**
 * Makes a standard material bounce its instances to the beat, by shader patching at compile time. Every patched
 * material shares the same uniform objects, so one write per frame moves bodies, heads and arms together.
 */
export function injectCrowdBounce<T extends Material>(material: T, uniforms: CrowdBounceUniforms): T {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBeat = uniforms.uBeat;
    shader.uniforms.uJump = uniforms.uJump;
    shader.vertexShader =
      crowdBounceParsChunk +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + crowdBounceVertexChunk);
  };
  return material;
}
