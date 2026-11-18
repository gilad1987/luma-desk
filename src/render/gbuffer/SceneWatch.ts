import { InstancedMesh } from 'three';
import type { Object3D } from 'three';

/** The elements of a world matrix that a move or a turn changes: a part of the rotation, and the translation. */
const MOVED = [0, 2, 5, 10, 12, 13, 14] as const;
/** World units per step of the hash: a quarter of a millimetre, and a turn of about 0.014 degrees. */
const STEPS = 4096;

/**
 * The "scene moved" signal of the surface buffers and the shadow maps. It keeps what the last swap of the scene
 * saw: every surface mesh, every object with children, and every hidden one that would add surfaces. Its stamp is
 * a hash of their world matrices, visibility and child counts, so it changes in the frame a performer sways, a
 * fixture head turns, scenery moves, loads or leaves, or a layer is switched; nobody has to report a move. At rest
 * it costs one pass over a flat list and no draw. It does not see a move made in a vertex shader (the audience
 * sways there): such a mesh is static scenery here, and only the age limits of the maps follow it.
 */
export class SceneWatch {
  readonly #objects: Object3D[] = [];
  readonly #isSurface: boolean[] = [];

  /** The number of objects watched. */
  get size(): number {
    return this.#objects.length;
  }

  clear(): void {
    this.#objects.length = this.#isSurface.length = 0;
  }

  /** Watches `object`; the world matrix of a surface is watched too. */
  add(object: Object3D, isSurface: boolean): void {
    this.#objects.push(object);
    this.#isSurface.push(isSurface);
  }

  /** A value that changes when a draw of the watched surfaces would change. Call it outside a swap. */
  stamp(): number {
    let hash = this.#objects.length;
    for (let i = 0; i < this.#objects.length; i++) {
      const object = this.#objects[i];
      if (!object) continue;
      // a hidden object counts as one state, whatever it holds: its children are not drawn
      hash = Math.imul(hash ^ object.id ^ ((object.visible ? object.children.length + 1 : 0) << 20), 16777619);
      if (this.#isSurface[i] !== true) continue;
      const m = object.matrixWorld.elements;
      for (const k of MOVED) hash = Math.imul(hash ^ ((m[k] ?? 0) * STEPS), 16777619);
      hash ^= object.layers.mask;
      if (object instanceof InstancedMesh) hash = Math.imul(hash ^ object.count ^ object.instanceMatrix.version, 31);
    }
    return hash;
  }
}
