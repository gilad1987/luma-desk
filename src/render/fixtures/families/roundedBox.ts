import type { BufferGeometry } from 'three';
import type { Vec3Tuple } from '../../../core';
import type { ModelPrimitives } from '../ModelPrimitives';

const ALONG_Z: Vec3Tuple = [Math.PI / 2, 0, 0];

/** A box centred `at`, of `size`, with its edges along one axis rounded by `r`. */
export interface RoundedBox {
  readonly at: Vec3Tuple;
  readonly size: Vec3Tuple;
  readonly r: number;
}

/** The four corner offsets of an `a` x `b` rectangle with corner radius `r`. */
const corners = (a: number, b: number, r: number): [number, number][] =>
  [-1, 1].flatMap((s) => [-1, 1].map((t): [number, number] => [s * (a / 2 - r), t * (b / 2 - r)]));

/** The parts of a box with its edges along `axis` rounded: two crossed boxes and four edge cylinders. */
export function rounded(
  { box, cylinder, cylinderX }: ModelPrimitives,
  axis: 'x' | 'z',
  { at: [x, y, z], size: [w, h, d], r }: RoundedBox,
): BufferGeometry[] {
  if (axis === 'x')
    return [
      box([x, y, z], [w, h - 2 * r, d]),
      box([x, y, z], [w, h, d - 2 * r]),
      ...corners(h, d, r).map(([cy, cz]) => cylinderX([x, y + cy, z + cz], r, w)),
    ];
  return [
    box([x, y, z], [w - 2 * r, h, d]),
    box([x, y, z], [w, h - 2 * r, d]),
    ...corners(w, h, r).map(([cx, cy]) => cylinder([x + cx, y + cy, z], r, d, ALONG_Z)),
  ];
}
