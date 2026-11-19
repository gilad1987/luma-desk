import type { Quat } from '../../domain/stage/types';
import { REST_ROTATION } from '../math/restRotation';

/** How close a rotation must be to the rest pose to count as it: 0.01 degrees (contract Amendment 3). */
const REST_TOLERANCE = (0.01 * Math.PI) / 180;

/** The angle between two rotations; `q` and `-q` are the same rotation. */
function angleBetween(a: Quat, b: Quat): number {
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, dot));
}

/**
 * The `rotation` an imported fixture keeps, or `undefined` when its body is in the pose `rest`. For the matrix of a
 * file the rest pose is the hanging one (GDTF draws a device hanging, and the MVR matrix turns that into the real
 * pose), so every other matrix, also a unit turned over to stand on the floor, is kept exactly: the body and its pan
 * zero face where the file says, and the desk aims in that body frame (`dirFrom` with a `rotation`). The luma data
 * step passes the rest pose of the mount instead for a fixture the desk exported without a `rotation`: the export
 * wrote the turned-over matrix for the desk's own floor pose, which aims by the floor formula, a mirror of "hung and
 * turned over", and such a fixture must come back with the aim it had (`applyLumaData`).
 */
export function bodyRotation(rotation: Quat, rest: Quat = REST_ROTATION): Quat | undefined {
  return angleBetween(rotation, rest) <= REST_TOLERANCE ? undefined : rotation;
}
