import type { Camera, Vector3 } from 'three';
import { clamp } from '../../core';

/** The length of an animated view change. */
const TWEEN_MS = 700;

/** Camera eye position and orbit target, the two things a view change moves. */
export interface CameraPose {
  readonly position: Vector3;
  readonly target: Vector3;
}

/** Ease-in-out on 0..1, so the camera starts and stops gently. */
function smoothstep01(k: number): number {
  return k * k * (3 - 2 * k);
}

/**
 * Moves the camera and the orbit target from one pose to another over 700 ms on its own requestAnimationFrame
 * chain. It reads `performance.now()` directly, as the legacy code did, so the `?test` time freeze still applies.
 * The first step runs at once. Returns a stop function: the caller stops a running tween before it moves the camera
 * again, so two moves never fight over the pose (a stage rebuild's refit, then a view button within 700 ms).
 */
export function tweenCamera(camera: Camera, orbitTarget: Vector3, from: CameraPose, to: CameraPose): () => void {
  const start = performance.now();
  let isStopped = false;
  const step = (): void => {
    if (isStopped) return;
    const k = clamp((performance.now() - start) / TWEEN_MS, 0, 1);
    const eased = smoothstep01(k);
    camera.position.lerpVectors(from.position, to.position, eased);
    orbitTarget.lerpVectors(from.target, to.target, eased);
    if (k < 1) requestAnimationFrame(step);
  };
  step();
  return () => {
    isStopped = true;
  };
}
