import type { Quat, Vec3 } from '../../domain/stage/types';
import { fromThree } from '../math/axes';
import { composeMatrix } from '../math/composeMatrix';
import { formatMvrMatrix } from '../math/Mat4';

/**
 * The `<Matrix>` text of a design pose. `offset` is the fit offset an MVR import added (zero for other designs); it is
 * taken off first, so a re-exported import lands at its original MVR coordinates and not shifted by the fit.
 */
export function poseMatrix(position: Vec3, rotation: Quat, offset: Vec3): string {
  const local: Vec3 = [position[0] - offset[0], position[1] - offset[1], position[2] - offset[2]];
  return formatMvrMatrix(fromThree(composeMatrix(local, rotation)));
}
