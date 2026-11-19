import { Matrix4, Mesh } from 'three';
import type { Camera, Object3D, Scene } from 'three';
import { SceneWatch } from '../gbuffer/SceneWatch';
import { writesDepth } from '../gbuffer/surfaceMaterial';
import { MAX_AGE } from '../lighting/SurfaceCache';

const isMesh = (object: Object3D): object is Mesh => object instanceof Mesh;

/**
 * Whether the occlusion image is out of date. It is a function of the scene depth alone, so it changes only when
 * the camera, the size or a mesh that writes depth changes: a look at rest seen from a camera at rest reuses it.
 * The scene signal is the one of the surface buffers (`SceneWatch`), kept here on its own list, because the surface
 * light draws its buffers only while a fixture is lit and the hall light needs the shade without one.
 */
export class OcclusionCache {
  readonly #watch = new SceneWatch();
  readonly #view = new Matrix4();
  readonly #projection = new Matrix4();
  readonly #meshes: Mesh[] = [];
  readonly #watched = new Set<Object3D>();
  #key = Number.NaN;
  #stamp = Number.NaN;
  #looks = Number.NaN;
  #age = 0;

  /**
   * True in a frame whose depth differs from the one the image was drawn for; that frame is then the new state. As
   * for the surface buffers, it is also true every `MAX_AGE` frames, for a move that no matrix shows (the audience
   * sways in its vertex shader).
   */
  isStale(
    camera: Camera,
    scene: Scene,
    size: { readonly width: number; readonly height: number },
    isEnabled: boolean,
  ): boolean {
    const key = (size.width * 16384 + size.height) * 2 + (isEnabled ? 1 : 0);
    const isMoved = this.#watch.stamp() !== this.#stamp;
    const looks = this.#materials();
    const isSame =
      !isMoved &&
      this.#age < MAX_AGE &&
      key === this.#key &&
      looks === this.#looks &&
      camera.matrixWorld.equals(this.#view) &&
      camera.projectionMatrix.equals(this.#projection);
    this.#age = isSame ? this.#age + 1 : 1;
    if (isSame) return false;
    if (isMoved) {
      // the list is rebuilt, as the move may be a mesh that came or left; at rest the stamp is one pass over it
      this.#watch.clear();
      this.#meshes.length = 0;
      this.#watched.clear();
      scene.traverse(this.#add);
      this.#stamp = this.#watch.stamp();
    }
    this.#looks = isMoved ? this.#materials() : looks;
    this.#key = key;
    this.#view.copy(camera.matrixWorld);
    this.#projection.copy(camera.projectionMatrix);
    return true;
  }

  /**
   * Watches each mesh that writes depth with its matrix, and each object above one for its visibility and children
   * (a hidden group of such meshes still counts). Beams, pools and glows write no depth, and a strobe shows and hides
   * them in each flash: watched, they redrew the occlusion for a depth that did not change. An empty group is watched
   * too, as the surface buffers watch it, so a mesh that loads into it later moves the stamp at once. The traversal
   * meets a parent before its children, so the walk up stops at the first object that is watched already.
   */
  readonly #add = (object: Object3D): void => {
    if (isMesh(object)) this.#meshes.push(object);
    if (isMesh(object) && writesDepth(object.material)) {
      this.#watched.add(object);
      this.#watch.add(object, true);
      for (let up = object.parent; up && !this.#watched.has(up); up = up.parent) {
        this.#watched.add(up);
        this.#watch.add(up, false);
      }
    } else if (object.type === 'Group' && object.children.length === 0) this.#watch.add(object, false);
  };

  /** Changes when a mesh gets another material: a wall that becomes an LED wall is an emitter without a move. */
  #materials(): number {
    let hash = 0;
    for (const mesh of this.#meshes) {
      const material = mesh.material;
      hash = Math.imul(hash ^ (Array.isArray(material) ? material.length : material.id), 16777619);
    }
    return hash;
  }
}
