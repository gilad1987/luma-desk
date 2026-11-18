import type { Vector3 } from 'three';
import type { Bvh } from './Bvh';
import { buildBvh } from './buildBvh';
import type { Leaf } from './bvhWalk';
import type { Ray } from './Ray';

/** A determinant closer to 0 than this means the ray runs in the triangle's plane, or the triangle has no area. */
const FLAT_DETERMINANT = 1e-20;

/** The box of each triangle: six floats per triangle from its nine. */
function triangleBoxes(points: Float32Array): Float32Array {
  const boxes = new Float32Array((points.length / 9) * 6);
  for (let at = 0, box = 0; at < points.length; at += 9, box += 6) {
    for (let k = 0; k < 3; k++) {
      const a = points[at + k] ?? 0;
      const b = points[at + k + 3] ?? 0;
      const c = points[at + k + 6] ?? 0;
      boxes[box + k] = Math.min(a, b, c);
      boxes[box + k + 3] = Math.max(a, b, c);
    }
  }
  return boxes;
}

/**
 * The triangles of one mesh in the mesh's own frame, with their hierarchy. Every placement of the mesh shares it:
 * an instance moves the ray into this frame, so a truss piece placed 500 times is stored and built once.
 */
export class TriangleMesh implements Leaf {
  readonly bvh: Bvh;
  /** Nine floats per triangle: its three corners. */
  readonly #points: Float32Array;

  constructor(points: Float32Array) {
    this.#points = points;
    this.bvh = buildBvh(triangleBoxes(points));
  }

  get triangleCount(): number {
    return this.#points.length / 9;
  }

  /**
   * Möller-Trumbore from either side: scenery has drapes and walls of one sheet, and a beam lands on them from both
   * faces. The ray direction need not be a unit vector; `t` counts in its lengths.
   */
  test(prim: number, ray: Ray): void {
    const p = this.#points;
    const at = prim * 9;
    const ax = p[at] ?? 0;
    const ay = p[at + 1] ?? 0;
    const az = p[at + 2] ?? 0;
    const ux = (p[at + 3] ?? 0) - ax;
    const uy = (p[at + 4] ?? 0) - ay;
    const uz = (p[at + 5] ?? 0) - az;
    const vx = (p[at + 6] ?? 0) - ax;
    const vy = (p[at + 7] ?? 0) - ay;
    const vz = (p[at + 8] ?? 0) - az;
    const px = ray.dy * vz - ray.dz * vy;
    const py = ray.dz * vx - ray.dx * vz;
    const pz = ray.dx * vy - ray.dy * vx;
    const det = ux * px + uy * py + uz * pz;
    if (Math.abs(det) < FLAT_DETERMINANT) return;
    const sx = ray.ox - ax;
    const sy = ray.oy - ay;
    const sz = ray.oz - az;
    const a = (sx * px + sy * py + sz * pz) / det;
    if (a < 0 || a > 1) return;
    const qx = sy * uz - sz * uy;
    const qy = sz * ux - sx * uz;
    const qz = sx * uy - sy * ux;
    const b = (ray.dx * qx + ray.dy * qy + ray.dz * qz) / det;
    if (b < 0 || a + b > 1) return;
    const t = (vx * qx + vy * qy + vz * qz) / det;
    if (t > ray.near && t < ray.t) {
      ray.t = t;
      ray.prim = prim;
    }
  }

  /** Writes the normal of a triangle into `out`, in the mesh's frame and not of unit length. */
  normalInto(prim: number, out: Vector3): void {
    const p = this.#points;
    const at = prim * 9;
    const ux = (p[at + 3] ?? 0) - (p[at] ?? 0);
    const uy = (p[at + 4] ?? 0) - (p[at + 1] ?? 0);
    const uz = (p[at + 5] ?? 0) - (p[at + 2] ?? 0);
    const vx = (p[at + 6] ?? 0) - (p[at] ?? 0);
    const vy = (p[at + 7] ?? 0) - (p[at + 1] ?? 0);
    const vz = (p[at + 8] ?? 0) - (p[at + 2] ?? 0);
    out.set(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
  }
}
