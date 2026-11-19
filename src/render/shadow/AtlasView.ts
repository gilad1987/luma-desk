import {
  Camera,
  GLSL3,
  Mesh,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector4,
  WebGLRenderTarget,
  type DepthTexture,
  type WebGLRenderer,
} from 'three';
import { viewFragmentShader, viewVertexShader } from './glsl';

/**
 * The debug view of a shadow atlas: the atlas on the canvas, and the depth of a part of it read back as numbers.
 * The atlas sampler only compares, so the view's shader searches the depth (see `glsl/view.frag.glsl`).
 */
export class AtlasView {
  readonly #scene = new Scene();
  readonly #camera = new Camera();
  readonly #rect = new Vector4(0, 0, 1, 1);
  readonly #pack = { value: 0 };
  readonly #quad = new PlaneGeometry(2, 2);
  readonly #material: ShaderMaterial;
  #target: WebGLRenderTarget | undefined;

  constructor(texture: DepthTexture) {
    this.#material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: viewVertexShader,
      fragmentShader: viewFragmentShader,
      uniforms: { tAtlas: { value: texture }, uRect: { value: this.#rect }, uPack: this.#pack },
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new Mesh(this.#quad, this.#material);
    // the quad is given in clip space, so the camera's frustum says nothing about it
    mesh.frustumCulled = false;
    this.#scene.add(mesh);
  }

  /** Draws the whole atlas over the canvas as grey: a near caster is dark and an empty tile is white. */
  show(renderer: WebGLRenderer): void {
    this.#rect.set(0, 0, 1, 1);
    this.#draw(renderer, null, 0);
  }

  /**
   * The depth (0 to 1, in steps of 1 / 65535) at `n` x `n` points of a part of the atlas, given in atlas UV as first
   * corner and size; the rows run from the first v upwards.
   */
  read(renderer: WebGLRenderer, [x, y, w, h]: readonly [number, number, number, number], n: number): Float32Array {
    if (this.#target?.width !== n) {
      this.#target?.dispose();
      this.#target = new WebGLRenderTarget(n, n, { depthBuffer: false });
    }
    this.#rect.set(x, y, w, h);
    this.#draw(renderer, this.#target, 1);
    const bytes = new Uint8Array(n * n * 4);
    renderer.readRenderTargetPixels(this.#target, 0, 0, n, n, bytes);
    return Float32Array.from(
      { length: n * n },
      (_, i) => ((bytes[i * 4] ?? 0) * 256 + (bytes[i * 4 + 1] ?? 0)) / 65535,
    );
  }

  #draw(renderer: WebGLRenderer, target: WebGLRenderTarget | null, pack: number): void {
    const previous = renderer.getRenderTarget();
    this.#pack.value = pack;
    renderer.setRenderTarget(target);
    renderer.render(this.#scene, this.#camera);
    renderer.setRenderTarget(previous);
  }

  dispose(): void {
    this.#quad.dispose();
    this.#material.dispose();
    this.#target?.dispose();
  }
}
