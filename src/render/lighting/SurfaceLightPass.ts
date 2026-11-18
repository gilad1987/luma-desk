import type { WebGLRenderer, WebGLRenderTarget } from 'three';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { GBuffer, type SurfaceBuffers } from '../gbuffer/GBuffer';
import type { BeamSource, SurfaceLightContext } from './BeamSource';
import { updateBounceUniforms } from './bounceUniforms';
import { KeyShadowMaps } from './KeyShadowMaps';
import { LightField } from './LightField';
import { createLightUniforms, updateLightUniforms, type LightUniforms } from './lightUniforms';
import { SurfaceBuffer } from './SurfaceBuffer';
import { DRAW, SurfaceCache } from './SurfaceCache';
import { surfaceLight } from './surfaceLight';

/**
 * The light of every lit fixture on the scenery of an MVR stage. It draws the surface buffers (normal, base colour,
 * roughness), then adds the light of each cone to the HDR scene with one instanced draw of the beam rows: matt term
 * and highlight of the real material, inverse square, gobo, and for the key lights a cached shadow map. It has no
 * history. It runs before the beams, so a shaft is drawn over the pool it makes.
 */
export class SurfaceLightPass extends Pass {
  readonly #context: SurfaceLightContext;
  readonly #source: BeamSource;
  readonly #surfaces: SurfaceBuffers = new GBuffer();
  readonly #shadows = new KeyShadowMaps();
  readonly #uniforms: LightUniforms;
  readonly #quads: SurfaceBuffer;
  readonly #field: LightField;
  readonly #cache = new SurfaceCache();
  #renderer: WebGLRenderer | undefined;

  constructor(context: SurfaceLightContext, source: BeamSource) {
    super();
    // the pass adds to the read buffer, as the scene copy before it does
    this.needsSwap = false;
    this.#context = context;
    this.#source = source;
    this.#uniforms = createLightUniforms(context.sceneDepth.texture, source.goboSheet, this.#surfaces, this.#shadows);
    this.#quads = new SurfaceBuffer(this.#uniforms, context.occlusion);
    this.#field = new LightField(this.#uniforms);
  }

  /** Lights the scenery in `readBuffer`; with no lit fixture it draws nothing, so a blackout stays black. */
  override render(renderer: WebGLRenderer, _writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget): void {
    // The fixture sync writes to the batch of the pass that draws: a chain that was built and then rejected must
    // not take the lights from the chain in use.
    const lights = this.#source.rows;
    if (!surfaceLight.isEnabled) {
      // Real light off: with no batch the fixture sync lays its floor pools and the stand-in lights are on again
      if (surfaceLight.batch === lights) surfaceLight.batch = undefined;
      return;
    }
    surfaceLight.batch = lights;
    const field = this.#field;
    field.reserve(lights.size);
    const count = lights.flush(field.rows, field.extras, this.#shadows);
    if (count === 0) return;
    const { camera, scene } = this.#context;
    const size = this.#uniforms.tDepth.value.image as { width: number; height: number };
    const { width, height } = size;
    updateLightUniforms(this.#uniforms, camera, size);
    updateBounceUniforms(this.#uniforms, camera, field.rows, count);
    // The buffers and the shadow maps are drawn only when what they show changed, and one of them per frame at
    // most: a look at rest costs neither. The layers are written before the rows go to the GPU.
    const stamp = this.#surfaces.stamp();
    const isPending = this.#shadows.update(field.rows, field.extras, stamp);
    field.show(count);
    const draw = this.#cache.plan(camera, size, stamp, isPending);
    this.#renderer = renderer;
    this.#shadows.prepare(renderer);
    this.#surfaces.setSize(width, height);
    if (draw === DRAW.buffers) this.#surfaces.render(renderer, scene, camera);
    else if (draw === DRAW.tile) this.#surfaces.casters(renderer, scene, camera, this.#drawShadows);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    try {
      if (draw === DRAW.buffers) this.#quads.renderNormals(renderer, width, height);
      renderer.setRenderTarget(readBuffer);
      this.#quads.renderBounce(renderer);
      renderer.render(field.scene, camera);
    } finally {
      renderer.autoClear = autoClear;
    }
  }

  /** Runs while the scene holds only its opaque surfaces: the shadow maps draw the same casters. No closure. */
  readonly #drawShadows = (): void => {
    const renderer = this.#renderer;
    if (renderer) this.#shadows.draw(renderer, this.#context.scene);
  };

  /** Frees the buffers, maps and programs, and gives the surface light back to the stand-ins. */
  override dispose(): void {
    if (surfaceLight.batch === this.#source.rows) surfaceLight.batch = undefined;
    this.#surfaces.dispose();
    this.#shadows.dispose();
    this.#quads.dispose();
    this.#field.dispose();
    if (this.#source.ownsSheet) this.#source.goboSheet.dispose();
  }
}
