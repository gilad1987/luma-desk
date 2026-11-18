import type { Mount } from '../../domain/Fixture';
import type { Quat } from '../../domain/stage/types';
import { restRotation } from '../math/restRotation';

/** How close a rotation must be to the rest pose to count as it: 0.01 degrees (contract Amendment 3). */
const REST_TOLERANCE = (0.01 * Math.PI) / 180;

/** The angle between two rotations; `q` and `-q` are the same rotation. */
function angleBetween(a: Quat, b: Quat): number {
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, dot));
}

/**
 * The `rotation` an imported fixture keeps, or `undefined` when its body is in the rest pose of `mount`. The desk
 * aims a floor unit without `rotation` by its own floor formula, which is a mirror of "hung and turned over"; keeping
 * the turned-over rotation would aim every floor unit of a round trip mirrored in z. Without it, `mount` decides, as
 * it did before the export.
 */
export function bodyRotation(rotation: Quat, mount: Mount): Quat | undefined {
  return angleBetween(rotation, restRotation(mount)) <= REST_TOLERANCE ? undefined : rotation;
}
