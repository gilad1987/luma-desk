import type { Vec3Tuple } from '../../core';

/** a - b. */
export function subtract(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** a + b x factor: a point at `factor` along the direction `b` from `a`. */
export function addScaled(a: Vec3Tuple, b: Vec3Tuple, factor: number): Vec3Tuple {
  return [a[0] + b[0] * factor, a[1] + b[1] * factor, a[2] + b[2] * factor];
}

/** The dot product. */
export function dot(a: Vec3Tuple, b: Vec3Tuple): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** The length. */
export function lengthOf(a: Vec3Tuple): number {
  return Math.sqrt(dot(a, a));
}
