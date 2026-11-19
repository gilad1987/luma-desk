import { GLSL3, ShaderMaterial, WebGLRenderTarget } from 'three';
import type { Texture, WebGLRenderer } from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { quadVertexShader } from '../beams/glsl';
import meterFragmentShader from './meter.frag.glsl?raw';
import { adaptStops, exposureOf, exposureStops, isRunning, METER, meterConstants, meteredStops } from './showExposure';

/** Frames between two readings of a running show: a reading waits for the GPU, and the exposure moves slowly. */
const EVERY = 6;

/**
 * The exposure of an MVR stage (`showExposure.ts` has the rule). It draws the HDR frame into a 16 x 9 meter image,
 * reads it back and sets the tone mapping exposure of the renderer for the output pass of the same frame; the chain
 * sets the base exposure before its passes and restores the renderer after them. It lives and dies with the pass
 * that owns it, so a built-in stage never creates it.
 */
export class ShowCamera {
  readonly #scene: { value: Texture | null } = { value: null };
  readonly #target = new WebGLRenderTarget(METER.width, METER.height, { depthBuffer: false });
  readonly #material = new ShaderMaterial({
    uniforms: { tScene: this.#scene },
    vertexShader: quadVertexShader,
    fragmentShader: `${meterConstants}\n${meterFragmentShader}`,
    glslVersion: GLSL3,
    depthTest: false,
    depthWrite: false,
  });
  readonly #quad = new FullScreenQuad(this.#material);
  readonly #pixels = new Uint8Array(METER.width * METER.height * 4);
  /** The exposure change in use, in stops; undefined before the first reading. */
  #stops: number | undefined;
  /** The show clock of the last frame and of the last reading, in seconds. */
  #frameAt = Number.NaN;
  #readAt = Number.NaN;
  #frames = 0;

  /** The exposure change in use, in stops from the base exposure. */
  get stops(): number {
    return this.#stops ?? 0;
  }

  /** Meters `frame` at the show clock `time` (seconds) and sets the exposure of the renderer. */
  expose(renderer: WebGLRenderer, frame: WebGLRenderTarget, time: number): void {
    const running = this.#stops !== undefined && isRunning(time - this.#frameAt);
    this.#frameAt = time;
    this.#frames = running ? this.#frames + 1 : EVERY;
    if (this.#frames >= EVERY) {
      const target = exposureStops(this.#read(renderer, frame));
      this.#stops = adaptStops(running ? this.#stops : undefined, target, time - this.#readAt);
      this.#readAt = time;
      this.#frames = 0;
    }
    renderer.toneMappingExposure = exposureOf(this.stops);
  }

  /** Frees the meter image and its program. */
  dispose(): void {
    this.#target.dispose();
    this.#material.dispose();
    this.#quad.dispose();
  }

  #read(renderer: WebGLRenderer, frame: WebGLRenderTarget): number {
    const drawnTo = renderer.getRenderTarget();
    this.#scene.value = frame.texture;
    renderer.setRenderTarget(this.#target);
    this.#quad.render(renderer);
    renderer.readRenderTargetPixels(this.#target, 0, 0, METER.width, METER.height, this.#pixels);
    renderer.setRenderTarget(drawnTo);
    return meteredStops(this.#pixels);
  }
}
