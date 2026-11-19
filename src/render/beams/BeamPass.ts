import { Color, HalfFloatType, WebGLRenderTarget } from 'three';
import type { Camera, ShaderMaterial, Texture, WebGLRenderer } from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import type { SceneDepth } from '../post/SceneDepth';
import { ShowCamera } from '../post/ShowCamera';
import { BeamBatch } from './BeamBatch';
import { BeamField } from './BeamField';
import { beamVolume } from './beamVolume';
import { createHazeNoise } from './hazeNoise';
import { createUpsampleMaterial } from './upsampleMaterial';
import { createVolumeUniforms, fitToDepth, updateVolumeUniforms } from './volumeUniforms';
import type { VolumeFrame, VolumeUniforms } from './volumeUniforms';

/** What the post chain gives a pass that adds light before the bloom. */
export interface BeamPassContext {
  readonly camera: Camera;
  readonly sceneDepth: SceneDepth;
}

/**
 * The volumetric beams of an MVR stage. It draws every lit beam into a half-resolution HDR target (the march is the
 * cost, and haze has no fine detail), then adds that target to the scene with an upsample that follows the scene
 * depth, so no beam light leaks over the edge of a truss or a figure. It runs before the bloom, so the bloom
 * sees a lens with its shaft, and it holds no history: a strobe is on or off in the frame it is drawn.
 */
export class BeamPass extends Pass {
  readonly batch = new BeamBatch();
  readonly exposure = new ShowCamera();
  readonly #camera: Camera;
  readonly #uniforms: VolumeUniforms;
  readonly #field: BeamField;
  readonly #target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false });
  readonly #quad: FullScreenQuad;
  readonly #upsample: ShaderMaterial;
  readonly #textures: readonly Texture[];
  readonly #clear = new Color();
  readonly #frame: VolumeFrame = { projection: [], targetHeight: 1, haze: 0, time: 0, count: 0 };

  /** `gobo` is the gobo sheet (4 x 2 cells); the pass owns it from here and frees it. */
  constructor(context: BeamPassContext, gobo: Texture) {
    super();
    // the pass adds to the read buffer, as the scene copy before it does
    this.needsSwap = false;
    this.#camera = context.camera;
    const noise = createHazeNoise();
    this.#textures = [gobo, noise];
    this.#uniforms = createVolumeUniforms(context.sceneDepth.texture, gobo, noise);
    this.#field = new BeamField(this.#uniforms);
    this.#upsample = createUpsampleMaterial(this.#uniforms, this.#target.texture);
    this.#quad = new FullScreenQuad(this.#upsample);
    // a free batch is taken at once, so the first frame of a new chain already draws volumes, not cones
    beamVolume.batch ??= this.batch;
  }

  /** Adds the lit beams to `readBuffer`; the show camera then meters the frame, with the last light before the bloom. */
  override render(renderer: WebGLRenderer, _writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget): void {
    this.#draw(renderer, readBuffer);
    this.exposure.expose(renderer, readBuffer, this.batch.time);
  }

  /** Frees the targets, textures and programs, and gives the beams back to the cone meshes. */
  override dispose(): void {
    if (beamVolume.batch === this.batch) beamVolume.batch = undefined;
    this.#field.dispose();
    this.#target.dispose();
    this.#upsample.dispose();
    this.#quad.dispose();
    this.exposure.dispose();
    this.#textures.forEach((texture) => texture.dispose());
  }

  /** Draws the lit beams and adds them to `readBuffer`; with no lit beam it does nothing. */
  #draw(renderer: WebGLRenderer, readBuffer: WebGLRenderTarget): void {
    // The fixture sync writes to the batch of the pass that draws. Set at construction, a chain that was built and
    // then rejected took the beams from the chain in use and cleared them when it was disposed.
    beamVolume.batch = this.batch;
    this.#field.reserve(this.batch.size);
    const count = this.batch.flush(this.#field.data);
    if (count === 0) return;
    this.#field.show(count);
    this.#frame.projection = this.#camera.projectionMatrix.elements;
    this.#frame.targetHeight = fitToDepth(this.#target, this.#uniforms.tDepth.value);
    this.#frame.haze = this.batch.haze;
    this.#frame.time = this.batch.time;
    this.#frame.count = count;
    updateVolumeUniforms(this.#uniforms, this.#frame);
    const autoClear = renderer.autoClear;
    const clearAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.#clear);
    renderer.autoClear = true;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.#target);
    renderer.render(this.#field.scene, this.#camera);
    renderer.autoClear = false;
    renderer.setRenderTarget(readBuffer);
    this.#quad.render(renderer);
    renderer.setClearColor(this.#clear, clearAlpha);
    renderer.autoClear = autoClear;
  }
}
