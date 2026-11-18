import type { Quat, Vec3 } from '../types';

/** A quaternion this long or shorter has no direction, so it cannot be normalized to a rotation. */
const MIN_QUAT_LENGTH = 1e-6;

/** A stored quaternion this close to unit length is kept as it is, so a saved design reads back bit for bit. */
const UNIT_TOLERANCE = 1e-12;

/** The three read numbers as a point, or `undefined` when the reader refused the list and recorded why. */
export function toVec3(read: readonly number[] | undefined): Vec3 | undefined {
  const [x, y, z] = read ?? [];
  return x === undefined || y === undefined || z === undefined ? undefined : [x, y, z];
}

/**
 * Normalizes a stored rotation, so every rotation in a design is a unit quaternion even after rounding in the JSON. A
 * quaternion that is already unit within `UNIT_TOLERANCE` is returned unchanged, so a design survives a save and load
 * exactly. A zero-length quaternion has no direction, so it goes to `fail` with the problem and its value. So does one
 * whose length overflows to Infinity: dividing by it would give a zero quaternion, which turns into NaN later.
 */
export function toUnitQuat(
  read: readonly number[] | undefined,
  fail: (problem: string) => undefined,
): Quat | undefined {
  const [x, y, z, w] = read ?? [];
  if (x === undefined || y === undefined || z === undefined || w === undefined) return undefined;
  const length = Math.hypot(x, y, z, w);
  if (length <= MIN_QUAT_LENGTH) return fail(`zero-length quaternion [${x}, ${y}, ${z}, ${w}]`);
  if (!Number.isFinite(length)) return fail(`quaternion too long to normalize [${x}, ${y}, ${z}, ${w}]`);
  if (Math.abs(length - 1) <= UNIT_TOLERANCE) return [x, y, z, w];
  return [x / length, y / length, z / length, w / length];
}
