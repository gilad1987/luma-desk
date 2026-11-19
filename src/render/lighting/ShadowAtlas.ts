import {
  DepthTexture,
  LessEqualCompare,
  LinearFilter,
  Matrix4,
  NearestFilter,
  PerspectiveCamera,
  RedFormat,
  WebGLRenderTarget,
} from 'three';
import type { Scene, WebGLRenderer } from 'three';
import { KEYS } from './KeyShadows';
import { aimTileCamera, COLUMNS, NEAR, ROWS, TILE, tileMatrix } from './shadowTile';
import { MAX_RANGE } from './surfacePhotometry';

/**
 * The shadow maps of the key lights as tiles of one depth texture, so the light shader reads any of them through
 * one sampler. A tile is drawn from the virtual apex of the cone along the beam axis with a field a little wider
 * than the cone, and its matrix is kept from that draw: a map that waits for its turn still fits the pose it
 * shows, and the shader takes a point outside the tile as lit.
 */
export class ShadowAtlas {
  readonly texture = new DepthTexture(COLUMNS * TILE, ROWS * TILE);
  readonly matrices: readonly Matrix4[] = Array.from({ length: KEYS }, () => new Matrix4());
  // the colour target only completes the framebuffer; one channel keeps it small
  readonly #target = new WebGLRenderTarget(COLUMNS * TILE, ROWS * TILE, {
    depthTexture: this.texture,
    format: RedFormat,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
  });
  readonly #camera = new PerspectiveCamera(30, 1, NEAR, MAX_RANGE);
  #isReady = false;

  constructor() {
    // compared and filtered by the sampler: four neighbours per read, for a soft edge
    this.texture.compareFunction = LessEqualCompare;
    this.texture.minFilter = this.texture.magFilter = LinearFilter;
    this.#target.scissorTest = true;
    // a lamp, not an eye: what sorts itself for the viewer (the audience levels) must not sort for this camera
    this.#camera.userData['passCamera'] = true;
  }

  /**
   * Makes the texture on the GPU before its first read, with every tile lit. A frame draws the surface buffers or
   * one map, so the lights can be drawn before any map is: the shadow sampler would then have no depth texture,
   * and WebGL drops the whole draw of the lights for that mismatch.
   */
  prepare(renderer: WebGLRenderer): void {
    if (this.#isReady) return;
    this.#isReady = true;
    this.#target.viewport.set(0, 0, COLUMNS * TILE, ROWS * TILE);
    this.#target.scissor.copy(this.#target.viewport);
    renderer.setRenderTarget(this.#target);
    renderer.clear();
  }

  /** Draws the tile of `slot` from its beam row in `poses`. The scene must hold only what casts a shadow. */
  draw(renderer: WebGLRenderer, scene: Scene, slot: number, poses: Float32Array): void {
    const camera = this.#camera;
    aimTileCamera(camera, poses, slot);
    this.#target.viewport.set((slot % COLUMNS) * TILE, Math.floor(slot / COLUMNS) * TILE, TILE, TILE);
    this.#target.scissor.copy(this.#target.viewport);
    renderer.setRenderTarget(this.#target);
    renderer.render(scene, camera);
    const matrix = this.matrices[slot];
    if (matrix) tileMatrix(slot, camera, matrix);
  }

  dispose(): void {
    this.#target.dispose();
    this.texture.dispose();
  }
}
