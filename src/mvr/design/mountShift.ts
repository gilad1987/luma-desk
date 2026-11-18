import type { Vec3 } from '../../domain/stage/types';
import { composeMatrix } from '../math/composeMatrix';
import { transformPoint } from '../math/Mat4';
import { restRotation } from '../math/restRotation';
import { mountHeight, type MountPose } from './mountHeight';

/** A fixture's pose and the point it is at, in the desk (three) frame. */
export interface PlacedPose extends MountPose {
  readonly position: Vec3;
}

/**
 * Which way `mountShift` moves: `toMount` from the model origin (the tilt axis, the desk `position`) to the MVR
 * insertion point, which the export writes; `toBody` from the insertion point back to the model origin (import).
 */
export type MountDirection = 'toMount' | 'toBody';

/**
 * `fixture.position` moved by its `mountHeight` along the drawn body's base axis (local +Y of the pose the desk draws:
 * up for a hung body, down for a floor body, sideways for a side-hung one). The export and the import call it with
 * the same fixture fields and opposite directions, so a round trip lands every fixture exactly where it was.
 */
export function mountShift(fixture: PlacedPose, direction: MountDirection): Vec3 {
  const pose = composeMatrix(fixture.position, fixture.rotation ?? restRotation(fixture.mount));
  const height = mountHeight(fixture);
  return transformPoint(pose, [0, direction === 'toMount' ? height : -height, 0]);
}
