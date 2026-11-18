import { Vector3, type BufferGeometry, type Matrix4 } from 'three';
import type { InstanceList } from './MeshInstances';
import { TriangleMesh } from './TriangleMesh';
import { trianglePoints } from './trianglePoints';

/** Where the three rows of four of a matrix lie in three.js `elements`, which run column by column. */
const ROWS = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14];

/** World boxes grow by this much (metres): they are stored as 32-bit floats and must never round to the inside. */
const BOX_PAD = 1e-3;

/**
 * Gathers the mesh instances of a stage. A geometry is read and built once, however many meshes and instances place
 * it; a geometry without triangles gives null. Its scratch vector is made here and not at module load: the object
 * creation order at boot is frozen.
 */
export class InstanceBuilder {
  /** The triangles of all instances together, as the world holds them. */
  triangleCount = 0;
  readonly #built = new Map<BufferGeometry, TriangleMesh | null>();
  readonly #meshes: TriangleMesh[] = [];
  readonly #inverse: number[] = [];
  readonly #layer: number[] = [];
  readonly #boxes: number[] = [];
  readonly #corner = new Vector3();

  meshOf(geometry: BufferGeometry): TriangleMesh | null {
    const known = this.#built.get(geometry);
    if (known !== undefined) return known;
    const points = geometry.hasAttribute('position') ? trianglePoints(geometry) : new Float32Array(0);
    const mesh = points.length > 0 ? new TriangleMesh(points) : null;
    this.#built.set(geometry, mesh);
    return mesh;
  }

  /** Adds `mesh` placed by `world` in a layer. It inverts `world` in place: the caller refills it per instance. */
  add(mesh: TriangleMesh, world: Matrix4, layerIndex: number): void {
    const bounds = mesh.bvh.bounds;
    const low = [Infinity, Infinity, Infinity];
    const high = [-Infinity, -Infinity, -Infinity];
    for (let c = 0; c < 8; c++) {
      const corner = this.#corner.set(
        bounds[c & 1 ? 3 : 0] ?? 0,
        bounds[c & 2 ? 4 : 1] ?? 0,
        bounds[c & 4 ? 5 : 2] ?? 0,
      );
      corner
        .applyMatrix4(world)
        .toArray()
        .forEach((value, k) => {
          low[k] = Math.min(low[k] ?? 0, value - BOX_PAD);
          high[k] = Math.max(high[k] ?? 0, value + BOX_PAD);
        });
    }
    this.#boxes.push(...low, ...high);
    const elements = world.invert().elements;
    for (const k of ROWS) this.#inverse.push(elements[k] ?? 0);
    this.#meshes.push(mesh);
    this.#layer.push(layerIndex);
    this.triangleCount += mesh.triangleCount;
  }

  list(): InstanceList {
    return {
      meshes: this.#meshes,
      inverse: Float64Array.from(this.#inverse),
      layer: Uint16Array.from(this.#layer),
      boxes: Float32Array.from(this.#boxes),
    };
  }
}
