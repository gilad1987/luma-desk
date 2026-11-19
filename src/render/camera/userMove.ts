import { Vector3 } from 'three';
import type { Camera } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** A change of the eye or the target below this (squared metres: 1 mm over the gesture) is no user move. */
const STILL = 1e-6;
/** Pointer travel below this (px) is a click; the same value as `CLICK_SLOP_PX` of the fixture picker in src/ui. */
const CLICK_SLOP_PX = 5;

/**
 * Calls `onMoved` when a gesture of the orbit controls ends with the camera moved. The controls send 'start' on
 * every pointer down, also for a plain click (a fixture pick on the same canvas), and turn the camera on every
 * pointer move while the button is down. So a pointer gesture whose pointer went less than the click slop from
 * pointerdown to pointerup is a click and never a move (review R2-38); a wheel zoom and a longer drag are moves when
 * the pose at 'end' differs from the pose at 'start'.
 */
export function watchUserMove(camera: Camera, controls: OrbitControls, onMoved: () => void): void {
  const position = new Vector3(),
    target = new Vector3();
  /** Where the button went down, and the travel at pointerup: this listener runs before the one of the controls. */
  let down: { readonly x: number; readonly y: number } | null = null;
  let travel: number | null = null;
  const element: GlobalEventHandlers = controls.domElement;
  element.addEventListener('pointerdown', (event) => {
    down = { x: event.clientX, y: event.clientY };
  });
  element.addEventListener('pointerup', (event) => {
    if (down) travel = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    down = null;
  });
  controls.addEventListener('start', () => {
    position.copy(camera.position);
    target.copy(controls.target);
    travel = null;
  });
  controls.addEventListener('end', () => {
    const isClick = travel !== null && travel < CLICK_SLOP_PX;
    travel = null;
    const isMoved =
      camera.position.distanceToSquared(position) > STILL || controls.target.distanceToSquared(target) > STILL;
    if (isMoved && !isClick) onMoved();
  });
}
