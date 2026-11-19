import { Line, Material, Mesh, Points, Sprite } from 'three';
import type { Camera, Object3D, Scene } from 'three';
import { SceneWatch } from './SceneWatch';
import { isSurface, writesDepth } from './surfaceMaterial';

const isMesh = (object: Object3D): object is Mesh => object instanceof Mesh;
const isSurfaceMesh = (object: Object3D): object is Mesh<Mesh['geometry'], Material> =>
  isMesh(object) && object.material instanceof Material && isSurface(object.material);
/** A mesh that moves its vertices in its shader (the audience) offers this: the replacement with that vertex code. */
type PassHook = (replacement: Material) => Material;
const passHook = (mesh: Mesh): PassHook | undefined => {
  const hook: unknown = mesh.userData['audiencePass'];
  return typeof hook === 'function' ? (hook as PassHook) : undefined;
};
const isDrawn = (object: Object3D): boolean =>
  object instanceof Mesh || object instanceof Line || object instanceof Points || object instanceof Sprite;

/**
 * Turns the scene into its opaque surfaces for one or more draws, then back. Every visible mesh with an opaque
 * material gets a replacement material. A mesh that writes depth but is no surface (glass, several materials) gets
 * the one "no data" material: it keeps its place in the depth, so the normal of the mesh behind it is never paired
 * with its depth. Everything else that draws (glows, lines) leaves by its layer mask, which children do not
 * inherit. Three's `overrideMaterial` cannot do this: it is one material for the whole scene. The lists are reused.
 */
export class SceneSwap {
  /** What the last swap saw: its stamp tells each frame whether a draw of the surfaces would differ. */
  readonly watch = new SceneWatch();
  readonly #meshes: Mesh[] = [];
  readonly #materials: Mesh['material'][] = [];
  readonly #hidden: Object3D[] = [];
  readonly #masks: number[] = [];
  #camera: Camera | undefined;
  #replace: ((material: Material) => Material) | undefined;
  #noData: Material | undefined;

  /** Swaps the materials of the surfaces that `camera` sees and hides the rest. Call `restore` after the draws. */
  apply(scene: Scene, camera: Camera, replace: (material: Material) => Material, noData: Material): void {
    this.#camera = camera;
    this.#replace = replace;
    this.#noData = noData;
    this.watch.clear();
    this.#walk(scene);
  }

  /** Gives every mesh its own material and every hidden object its layers back. */
  restore(): void {
    for (let i = 0; i < this.#meshes.length; i++) {
      const mesh = this.#meshes[i];
      const material = this.#materials[i];
      if (mesh && material) mesh.material = material;
    }
    for (let i = 0; i < this.#hidden.length; i++) {
      const object = this.#hidden[i];
      if (object) object.layers.mask = this.#masks[i] ?? 1;
    }
    this.#meshes.length = this.#materials.length = this.#hidden.length = this.#masks.length = 0;
  }

  /** The visible tree, as the renderer walks it. A hidden branch that would add surfaces is watched for its return. */
  #walk(object: Object3D): void {
    if (!object.visible) {
      if (object.children.length > 0 || isSurfaceMesh(object)) this.watch.add(object, false);
      return;
    }
    this.#visit(object);
    const children = object.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child) this.#walk(child);
    }
  }

  #visit(object: Object3D): void {
    const camera = this.#camera;
    const replace = this.#replace;
    const noData = this.#noData;
    if (!camera || !replace || !noData) return;
    const isSeen = isDrawn(object) && object.layers.test(camera.layers);
    if (isSeen && isSurfaceMesh(object)) {
      this.#meshes.push(object);
      this.#materials.push(object.material);
      const made = replace(object.material);
      object.material = passHook(object)?.(made) ?? made;
      this.watch.add(object, true);
      return;
    }
    // a group is watched while it is still empty: a mesh that loads into it later must move the stamp at once
    if (object.children.length > 0 || object.type === 'Group') this.watch.add(object, false);
    if (!isSeen) return;
    if (isMesh(object) && writesDepth(object.material)) {
      this.#meshes.push(object);
      this.#materials.push(object.material);
      object.material = noData;
      return;
    }
    this.#hidden.push(object);
    this.#masks.push(object.layers.mask);
    object.layers.mask = 0;
  }
}
