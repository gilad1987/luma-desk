import type { Mount } from '../../domain/Fixture';
import type { Quat } from '../../domain/stage/types';

/** No rotation: for a fixture, the hanging rest pose with the beam straight down. */
export const REST_ROTATION: Quat = [0, 0, 0, 1];

/** A floor unit turned over about X: its beam points straight up, which the import reads back as `floor`. */
const FLOOR_ROTATION: Quat = [1, 0, 0, 0];

/**
 * The body rotation of a fixture without `rotation`: its mount decides, as it does in the desk's aim code. The export
 * writes it and the import compares against it, so both sides read one table and a round trip keeps the pose.
 */
export function restRotation(mount: Mount): Quat {
  return mount === 'floor' ? FLOOR_ROTATION : REST_ROTATION;
}
