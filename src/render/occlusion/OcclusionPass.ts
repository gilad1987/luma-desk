import { GLSL3, NearestFilter, ShaderMaterial, WebGLRenderTarget } from 'three';
import type { Camera, Scene, Texture, WebGLRenderer } from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { quadVertexShader } from '../beams/glsl';
import type { SceneDepth } from '../post/SceneDepth';
import { EmitterMask } from './EmitterMask';
import { applyFragmentShader, blurFragmentShader, occlusionFragmentShader } from './glsl';
import { occlusion } from './occlusion';
import { OcclusionCache } from './OcclusionCache';
import { createOcclusionUniforms, updateOcclusionUniforms, type OcclusionUniforms } from './occlusionUniforms';

/** What the pass takes from the post chain: the render camera, the scene (to see it move) and its depth. */
export interface OcclusionContext {
  readonly camera: Camera;
  readonly scene: Scene;
  readonly sceneDepth: SceneDepth;
}

const TARGET = { depthBuffer: false, minFilter: NearestFilter, magFilter: NearestFilter } as const;
const PROGRAM = { vertexShader: quadVertexShader, glslVersion: GLSL3, depthTest: false, depthWrite: false } as const;

/**
 * The ambient occlusion of an MVR stage. It measures the occlusion from the scene depth at half size, only in a
 * frame whose depth changed (`OcclusionCache`), and in every frame shades the scene colour with it: that colour is
 * the hall light and the emitters, and the emitters are left as they are. It runs before the surface light, whose
 * bounce reads `texture`, and before the beams. It has no history and no clock, so a frame at rest never crawls.
 */
export class OcclusionPass extends Pass {
  /** The occlusion image (`openAt` in `glsl/open.glsl` reads it); this pass draws it before any pass reads it. */
  readonly texture: Texture;
  readonly #context: OcclusionContext;
  readonly #raw = new WebGLRenderTarget(1, 1, TARGET);
  readonly #smooth = new WebGLRenderTarget(1, 1, TARGET);
  readonly #uniforms: OcclusionUniforms;
  readonly #measure: ShaderMaterial;
  readonly #blur: ShaderMaterial;
  readonly #apply: ShaderMaterial;
  readonly #quad: FullScreenQuad;
  readonly #cache = new OcclusionCache();
  readonly #mask: EmitterMask;

  constructor(context: OcclusionContext) {
    super();
    this.#context = context;
    this.texture = this.#smooth.texture;
    this.#mask = new EmitterMask(context.sceneDepth.texture);
    const uniforms = createOcclusionUniforms(context.sceneDepth.texture, this.#mask.texture);
    this.#uniforms = uniforms;
    this.#measure = new ShaderMaterial({ ...PROGRAM, uniforms, fragmentShader: occlusionFragmentShader });
    // the blur reads the measured image and the two other programs the smooth one; the camera terms are shared
    const measured = { ...uniforms, tAo: { value: this.#raw.texture } };
    this.#blur = new ShaderMaterial({ ...PROGRAM, uniforms: measured, fragmentShader: blurFragmentShader });
    const smooth = { ...uniforms, tAo: { value: this.texture } };
    this.#apply = new ShaderMaterial({ ...PROGRAM, uniforms: smooth, fragmentShader: applyFragmentShader });
    this.#quad = new FullScreenQuad(this.#measure);
  }

  /** Writes the shaded scene to `writeBuffer`; the composer then swaps, so the passes after it add their light. */
  override render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget): void {
    const { camera, scene, sceneDepth } = this.#context;
    const size = sceneDepth.texture.image;
    const isEnabled = occlusion.isEnabled;
    updateOcclusionUniforms(this.#uniforms, camera, size, isEnabled);
    if (this.#cache.isStale(camera, scene, size, isEnabled)) {
      this.#mask.draw(renderer, scene, camera, size);
      this.#measureAt(renderer, size.width, size.height);
    }
    this.#uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.#quad.material = this.#apply;
    this.#quad.render(renderer);
  }

  /** Draws the occlusion of this frame's depth: one cell per 2 x 2 depth pixels, then the blur of the pattern. */
  #measureAt(renderer: WebGLRenderer, width: number, height: number): void {
    const cellsX = Math.max(1, Math.ceil(width / 2));
    const cellsY = Math.max(1, Math.ceil(height / 2));
    if (this.#raw.width !== cellsX || this.#raw.height !== cellsY) {
      this.#raw.setSize(cellsX, cellsY);
      this.#smooth.setSize(cellsX, cellsY);
    }
    renderer.setRenderTarget(this.#raw);
    this.#quad.material = this.#measure;
    this.#quad.render(renderer);
    renderer.setRenderTarget(this.#smooth);
    this.#quad.material = this.#blur;
    this.#quad.render(renderer);
  }

  /** Frees the two images and the programs. */
  override dispose(): void {
    this.#mask.dispose();
    this.#raw.dispose();
    this.#smooth.dispose();
    this.#measure.dispose();
    this.#blur.dispose();
    this.#apply.dispose();
    this.#quad.dispose();
  }
}
