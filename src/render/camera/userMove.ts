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
 * pointer move while the button is down. So a pointer gesture whose pointer went less than the click slop from its
 * own pointerdown to its pointerup is a click and never a move (review R2-38); a wheel zoom, a longer drag and a
 * gesture of two pointers at once are moves when the pose at 'end' differs from the pose at 'start'.
 */
export function watchUserMove(camera: Camera, controls: OrbitControls, onMoved: () => void): void {
  const position = new Vector3(),
    target = new Vector3();
  /**
   * Where each pointer that is down went down, by pointerId, and the travel at pointerup of the pointer that went up:
   * this listener runs before the one of the controls. A gesture with two pointers down at once (a pinch) is no click.
   * A primary pointerdown means no other pointer of its type is down, so it forgets every press before it: a pointer
   * whose pointerup never came to the canvas (review R2-38).
   */
  const downs = new Map<number, { readonly x: number; readonly y: number }>();
  let isMulti = false;
  let travel: number | null = null;
  const element: GlobalEventHandlers = controls.domElement;
  element.addEventListener('pointerdown', (event) => {
    if (event.isPrimary) {
      downs.clear();
      isMulti = false;
    }
    downs.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (downs.size > 1) isMulti = true;
  });
  const forget = (event: PointerEvent): void => {
    downs.delete(event.pointerId);
    if (downs.size === 0) isMulti = false;
  };
  element.addEventListener('pointerup', (event) => {
    const down = downs.get(event.pointerId);
    if (down) travel = isMulti ? Infinity : Math.hypot(event.clientX - down.x, event.clientY - down.y);
    forget(event);
  });
  element.addEventListener('pointercancel', forget);
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
