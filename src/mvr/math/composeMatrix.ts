import type { Quat, Vec3 } from '../../domain/stage/types';
import { identity, type Mat4 } from './Mat4';

/**
 * The three-frame transform (metres, Y up) of a design pose: rotation by the unit quaternion `rotation`, then the move
 * to `position`, as three.js `Matrix4.compose` builds it with scale 1. The exporter passes it to `fromThree`, so a
 * design pose becomes the MVR matrix that `toThree` and `quaternionOf` read back to the same pose. The quaternion is
 * normalised first, because a hand-edited design may hold one that is slightly off unit length.
 */
export function composeMatrix(position: Vec3, rotation: Quat): Mat4 {
  const [qx, qy, qz, qw] = rotation;
  const length = Math.hypot(qx, qy, qz, qw) || 1;
  const [x, y, z, w] = [qx / length, qy / length, qz / length, qw / length];
  const m = identity();
  m.set([1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y)], 0);
  m.set([2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)], 4);
  m.set([2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)], 8);
  m.set(position, 12);
  return m;
}
