import { NearestFilter, WebGLMultipleRenderTargets } from 'three';
import type { Camera, Scene, Texture, WebGLRenderer } from 'three';
import { DrawState } from './DrawState';
import { SceneSwap } from './SceneSwap';
import type { SurfaceBuffers } from './SurfaceBuffers';
import { createNoDataMaterial } from './surfaceMaterial';
import { SurfaceMaterials } from './SurfaceMaterials';

export type { SurfaceBuffers } from './SurfaceBuffers';

/**
 * The surface buffers by one more draw of the opaque scene into two targets at once. The scene pass keeps its
 * materials and its MSAA resolve: three.js 0.160 has no way to add outputs to every built-in material, and an MSAA
 * resolve would average normals across an edge.
 */
export class GBuffer implements SurfaceBuffers {
  readonly normal: Texture;
  readonly surface: Texture;
  readonly #target = new WebGLMultipleRenderTargets(1, 1, 2, { minFilter: NearestFilter, magFilter: NearestFilter });
  readonly #swap = new SceneSwap();
  readonly #materials = new SurfaceMaterials();
  readonly #noData = createNoDataMaterial();
  readonly #state = new DrawState();

  constructor() {
    const [normal, surface] = this.#target.texture;
    if (!normal || !surface) throw new Error('The surface buffers need two colour targets');
    this.normal = normal;
    this.surface = surface;
  }

  get width(): number {
    return this.#target.width;
  }

  get height(): number {
    return this.#target.height;
  }

  stamp(): number {
    return this.#swap.watch.stamp();
  }

  setSize(width: number, height: number): void {
    if (this.#target.width !== width || this.#target.height !== height) this.#target.setSize(width, height);
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
    this.#noData.visible = true;
    this.#state.open(renderer, scene);
    // a draw that throws (a lost context, a program that does not compile) must not leave the stage swapped
    try {
      this.#swap.apply(scene, camera, this.#materials.of, this.#noData);
      renderer.setRenderTarget(this.#target);
      renderer.render(scene, camera);
    } finally {
      this.#swap.restore();
      this.#state.close(renderer, scene);
    }
  }

  casters(renderer: WebGLRenderer, scene: Scene, camera: Camera, draw: () => void): void {
    // a mesh that is no surface (glass, a gauze) casts no shadow: an invisible material is not drawn
    this.#noData.visible = false;
    this.#state.open(renderer, scene);
    try {
      this.#swap.apply(scene, camera, this.#materials.of, this.#noData);
      draw();
    } finally {
      this.#swap.restore();
      this.#state.close(renderer, scene);
    }
  }

  dispose(): void {
    this.#target.dispose();
    this.#materials.dispose();
    this.#noData.dispose();
  }
}
