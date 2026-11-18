import type { Vector3 } from 'three';
import { STACK_SIZE, type Bvh } from './Bvh';
import { buildBvh } from './buildBvh';
import { walk, type Leaf } from './bvhWalk';
import { Ray } from './Ray';
import type { TriangleMesh } from './TriangleMesh';

/** The placed meshes of a stage, one entry per instance. */
export interface InstanceList {
  /** The mesh each instance places. */
  readonly meshes: readonly TriangleMesh[];
  /** Twelve numbers per instance: the world-to-mesh matrix, three rows of four. */
  readonly inverse: Float64Array;
  /** The layer index of each instance: its holder in `collectScenery`, whose visibility gates it. */
  readonly layer: Uint16Array;
  /** The world box of each instance, six floats. */
  readonly boxes: Float32Array;
  /** What each instance is for a beam near its lens: a `RIG_KIND`. */
  readonly kind: Uint8Array;
}

/**
 * Every mesh instance of a stage under one hierarchy of their world boxes. A ray that enters an instance box moves
 * into the mesh's frame and walks the mesh's own triangles there. The matrix moves the direction without making it
 * a unit vector again, so a distance in the mesh frame is the same number as in the world and needs no change.
 */
export class MeshInstances implements Leaf {
  /** One flag per layer index: 0 lets rays pass through all its instances. The owner sets them. */
  readonly shown: Uint8Array;
  /** The `RIG_KIND` of each instance, by `ray.prim`. */
  readonly kind: Uint8Array;
  readonly #list: InstanceList;
  readonly #bvh: Bvh;
  readonly #outer = new Uint32Array(STACK_SIZE);
  readonly #inner = new Uint32Array(STACK_SIZE);
  readonly #local = new Ray();
  /** The triangle of the nearest hit inside the instance `ray.prim`. */
  #triangle = -1;

  constructor(list: InstanceList, layerCount: number) {
    this.#list = list;
    this.kind = list.kind;
    this.#bvh = buildBvh(list.boxes);
    this.shown = new Uint8Array(layerCount).fill(1);
  }

  /** Lowers `ray.t` to the nearest triangle of a shown layer and sets `ray.prim` to its instance; else leaves both. */
  trace(ray: Ray): void {
    walk(this.#bvh, ray, this, this.#outer);
  }

  test(prim: number, ray: Ray): void {
    const { meshes, inverse, layer } = this.#list;
    const mesh = meshes[prim];
    if (!mesh || this.shown[layer[prim] ?? 0] === 0) return;
    const local = this.#local;
    local.setMoved(ray, inverse, prim * 12);
    walk(mesh.bvh, local, mesh, this.#inner);
    if (local.prim < 0) return;
    ray.t = local.t;
    ray.prim = prim;
    this.#triangle = local.prim;
  }

  /**
   * Writes the unit world normal of the hit that the last `trace` left in `ray.prim`. A normal moves by the
   * transpose of the world-to-mesh matrix, which stays right for an instance that is scaled unevenly.
   */
  normalInto(instance: number, out: Vector3): void {
    const m = this.#list.inverse;
    const at = instance * 12;
    this.#list.meshes[instance]?.normalInto(this.#triangle, out);
    const { x, y, z } = out;
    out
      .set(
        (m[at] ?? 0) * x + (m[at + 4] ?? 0) * y + (m[at + 8] ?? 0) * z,
        (m[at + 1] ?? 0) * x + (m[at + 5] ?? 0) * y + (m[at + 9] ?? 0) * z,
        (m[at + 2] ?? 0) * x + (m[at + 6] ?? 0) * y + (m[at + 10] ?? 0) * z,
      )
      .normalize();
  }
}
