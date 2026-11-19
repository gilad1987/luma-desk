import { GLSL3, NearestFilter, ShaderMaterial, WebGLRenderTarget } from 'three';
import type { Texture, WebGLRenderer } from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { quadVertexShader } from '../beams/glsl';
import { ambientFragmentShader, normalFragmentShader } from './glsl';
import { ADDITIVE, type LightUniforms } from './lightUniforms';

/**
 * The two full-screen draws of the surface light. The first rebuilds a normal from the scene depth for the pixels
 * where the surface buffers hold none (a mesh they do not draw, a geometry without normals), so those pixels are
 * still lit. The second adds the bounce of the lit stage to every surface.
 */
export class SurfaceBuffer {
  readonly #target = new WebGLRenderTarget(1, 1, {
    depthBuffer: false,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
  });
  readonly #normals: ShaderMaterial;
  readonly #bounce: ShaderMaterial;
  readonly #quad: FullScreenQuad;

  /** Puts its normal texture and the occlusion image of the bounce into `uniforms`, which the programs share. */
  constructor(uniforms: LightUniforms, occlusion: Texture) {
    uniforms.tNormal.value = this.#target.texture;
    uniforms.tAo.value = occlusion;
    this.#normals = new ShaderMaterial({
      uniforms,
      vertexShader: quadVertexShader,
      fragmentShader: normalFragmentShader,
      glslVersion: GLSL3,
      depthTest: false,
      depthWrite: false,
    });
    this.#bounce = new ShaderMaterial({
      ...ADDITIVE,
      uniforms,
      vertexShader: quadVertexShader,
      fragmentShader: ambientFragmentShader,
    });
    this.#quad = new FullScreenQuad(this.#normals);
  }

  /** Draws the fallback normals at the size of the scene depth. Only the pixels that are read are written. */
  renderNormals(renderer: WebGLRenderer, width: number, height: number): void {
    if (this.#target.width !== width || this.#target.height !== height) this.#target.setSize(width, height);
    renderer.setRenderTarget(this.#target);
    this.#quad.material = this.#normals;
    this.#quad.render(renderer);
  }

  /** Adds the bounce to the current render target. */
  renderBounce(renderer: WebGLRenderer): void {
    this.#quad.material = this.#bounce;
    this.#quad.render(renderer);
  }

  /** Frees the target and the programs. */
  dispose(): void {
    this.#target.dispose();
    this.#normals.dispose();
    this.#bounce.dispose();
    this.#quad.dispose();
  }
}
