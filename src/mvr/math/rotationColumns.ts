import type { Point3 } from './Aabb';
import type { Mat4 } from './Mat4';

/** Column `col` of the 3x3 part of `m`. */
const column = (m: Mat4, col: number): Point3 => [m[col * 4] ?? 0, m[col * 4 + 1] ?? 0, m[col * 4 + 2] ?? 0];

const dot = (a: Point3, b: Point3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const cross = (a: Point3, b: Point3): Point3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** `a - b·s`: removes the part of `a` along a unit vector `b` when `s = a·b`. */
const minusScaled = (a: Point3, b: Point3, s: number): Point3 => [a[0] - b[0] * s, a[1] - b[1] * s, a[2] - b[2] * s];

/** `a` with length 1, or `undefined` for a zero vector, which has no direction. */
function normalised(a: Point3): Point3 | undefined {
  const length = Math.sqrt(dot(a, a));
  return length > 1e-12 ? [a[0] / length, a[1] / length, a[2] / length] : undefined;
}

/**
 * The pure rotation of `m` as unit columns x, y, z (Gram-Schmidt). This drops scale and skew, which MVR files often
 * carry, and forces a right-handed result, because a mirrored fixture body has no quaternion. `undefined` when the
 * matrix squashes an axis to zero, so it has no orientation.
 */
export function rotationColumns(m: Mat4): readonly [Point3, Point3, Point3] | undefined {
  const x = normalised(column(m, 0));
  if (!x) return undefined;
  const yRaw = column(m, 1);
  const y = normalised(minusScaled(yRaw, x, dot(yRaw, x)));
  return y ? [x, y, cross(x, y)] : undefined;
}
