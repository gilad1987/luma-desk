import { transformPoint, type Mat4 } from './Mat4';

/** Three coordinates in whatever frame the box is in; the caller of each box says which frame. */
export type Point3 = readonly [number, number, number];

/**
 * An axis-aligned box. Mesh sizes, the fit and the deck search only need boxes, not triangles, so the importer reads
 * bounds and never loads full meshes.
 */
export interface Aabb {
  readonly min: Point3;
  readonly max: Point3;
}

/** The box that contains nothing: `union` with it changes nothing, so a fold over boxes can start from it. */
export function emptyBox(): Aabb {
  return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
}

/** True when the box contains no point, for example a fold over zero meshes. */
export function isEmpty(box: Aabb): boolean {
  return box.min[0] > box.max[0] || box.min[1] > box.max[1] || box.min[2] > box.max[2];
}

/**
 * True when all six numbers are finite. One NaN or infinite vertex would spread through every `union` into the fit
 * and every fixture position, and `isEmpty` cannot see a NaN, so mesh readers reject such boxes at the file boundary.
 */
export function isFiniteBox(box: Aabb): boolean {
  return [...box.min, ...box.max].every(Number.isFinite);
}

/** The smallest box that holds both boxes. */
export function union(a: Aabb, b: Aabb): Aabb {
  return {
    min: [Math.min(a.min[0], b.min[0]), Math.min(a.min[1], b.min[1]), Math.min(a.min[2], b.min[2])],
    max: [Math.max(a.max[0], b.max[0]), Math.max(a.max[1], b.max[1]), Math.max(a.max[2], b.max[2])],
  };
}

/** The box of one point, so points and boxes fold together with `union`. */
export function pointBox(p: Point3): Aabb {
  return { min: p, max: p };
}

/**
 * The axis-aligned box around `box` moved by `m`. All 8 corners are moved, because a rotation can turn any corner
 * into the new extreme. An empty box stays empty.
 */
export function transformBox(box: Aabb, m: Mat4): Aabb {
  if (isEmpty(box)) return emptyBox();
  let out = emptyBox();
  for (let corner = 0; corner < 8; corner++) {
    const x = corner & 1 ? box.max[0] : box.min[0];
    const y = corner & 2 ? box.max[1] : box.min[1];
    const z = corner & 4 ? box.max[2] : box.min[2];
    out = union(out, pointBox(transformPoint(m, [x, y, z])));
  }
  return out;
}

/** The box moved by `delta` without rotation, for example by the fit offset. */
export function shiftBox(box: Aabb, delta: Point3): Aabb {
  return {
    min: [box.min[0] + delta[0], box.min[1] + delta[1], box.min[2] + delta[2]],
    max: [box.max[0] + delta[0], box.max[1] + delta[1], box.max[2] + delta[2]],
  };
}
