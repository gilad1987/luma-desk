import { Vector3 } from 'three';
import type { Camera } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** A step of the eye or the target below this (squared metres: 1 mm) is the tail of the damping, not a user move. */
const STILL = 1e-6;

/**
 * Calls `onMoved` when a gesture of the orbit controls ends with the camera moved. The controls send 'start' on
 * every pointer down, also for a plain click (a fixture pick on the same canvas), so the pose is compared at 'end'.
 */
export function watchUserMove(camera: Camera, controls: OrbitControls, onMoved: () => void): void {
  const position = new Vector3(),
    target = new Vector3();
  controls.addEventListener('start', () => {
    position.copy(camera.position);
    target.copy(controls.target);
  });
  controls.addEventListener('end', () => {
    const isMoved =
      camera.position.distanceToSquared(position) > STILL || controls.target.distanceToSquared(target) > STILL;
    if (isMoved) onMoved();
  });
}
