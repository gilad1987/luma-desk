import { DoubleSide, GLSL3, Mesh, MeshBasicMaterial, MeshStandardMaterial, NearestFilter } from 'three';
import { RedFormat, ShaderMaterial, WebGLRenderTarget } from 'three';
import type { Camera, Material, Object3D, Scene, Texture, WebGLRenderer } from 'three';
import { DrawState } from '../gbuffer/DrawState';
import { emitterFragmentShader, emitterVertexShader } from './glsl';

/** A layer no camera of the desk shows: the meshes of the mask carry it next to their own layers. */
const EMITTER_LAYER = 30;

/**
 * A material that shows its own light: an unlit one (a lens face), one with an image to emit, and the LED wall
 * material, which carries `ledFront` in its user data (`createLedMaterial`) and may emit a pattern with no image.
 */
function isUnlit(material: Material): boolean {
  if (!material.visible || !material.depthWrite) return false;
  if (material instanceof MeshBasicMaterial || 'ledFront' in material.userData) return true;
  return material instanceof MeshStandardMaterial && material.emissiveMap !== null;
}

/** A mesh whose colour in the scene is its own light and that is in the scene depth. */
function isEmitter(object: Object3D): boolean {
  if (!(object instanceof Mesh)) return false;
  const material = (object as Mesh).material;
  return Array.isArray(material) ? material.length > 0 && material.every(isUnlit) : isUnlit(material);
}

function tag(object: Object3D): void {
  if (isEmitter(object)) object.layers.enable(EMITTER_LAYER);
  else object.layers.disable(EMITTER_LAYER);
}

const untag = (object: Object3D): void => object.layers.disable(EMITTER_LAYER);

/**
 * Where the scene shows a surface that makes its own light. The occlusion shades the scene colour, and the scene
 * pass keeps no record of which pixel was lit by the hall and which is unlit: a wall at a quarter of its level is
 * as bright as a white shirt. So the unlit meshes are drawn once more, alone, and a pixel counts where such a mesh
 * is the surface in the scene depth. It is drawn with the occlusion image, only in a frame whose depth changed.
 */
export class EmitterMask {
  /** r is 1 in a pixel of an emitter, else 0; the size of the scene depth. */
  readonly texture: Texture;
  readonly #target = new WebGLRenderTarget(1, 1, {
    depthBuffer: false,
    format: RedFormat,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
  });
  readonly #state = new DrawState();
  readonly #material: ShaderMaterial;
  /** The scene whose meshes carry the mask layer since the last draw. */
  #scene: Scene | undefined;

  constructor(depth: Texture) {
    this.texture = this.#target.texture;
    this.#material = new ShaderMaterial({
      uniforms: { tDepth: { value: depth } },
      vertexShader: emitterVertexShader,
      fragmentShader: emitterFragmentShader,
      glslVersion: GLSL3,
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
  }

  /** Draws the mask for the frame the scene pass just drew. `camera` is the render camera; it is left as it was. */
  draw(renderer: WebGLRenderer, scene: Scene, camera: Camera, size: { width: number; height: number }): void {
    const { width, height } = size;
    if (this.#target.width !== width || this.#target.height !== height) this.#target.setSize(width, height);
    scene.traverse(tag);
    this.#scene = scene;
    const layers = camera.layers.mask;
    const override = scene.overrideMaterial;
    this.#state.open(renderer, scene);
    // a draw that throws must not leave the camera on the mask layer or the scene with one material
    try {
      camera.layers.set(EMITTER_LAYER);
      scene.overrideMaterial = this.#material;
      renderer.setRenderTarget(this.#target);
      renderer.render(scene, camera);
    } finally {
      scene.overrideMaterial = override;
      camera.layers.mask = layers;
      this.#state.close(renderer, scene);
    }
  }

  /** Frees the target and the program, and takes the mask layer off the meshes: the scene outlives the mask. */
  dispose(): void {
    this.#scene?.traverse(untag);
    this.#scene = undefined;
    this.#target.dispose();
    this.#material.dispose();
  }
}
