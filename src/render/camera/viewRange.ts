import type { PerspectiveCamera } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { StageBounds } from '../../domain/stage/types';

/** The clip planes of the built-in stages (metres); their depth precision is the one every stage keeps. */
const NEAR = 0.1;
const FAR = 1600;
/** The lowest orbit of the built-in stages: just above level, so the eye never dips under the venue floor. */
const BUILT_IN_POLAR = Math.PI * 0.495;
/** How many scene diagonals the far plane lies out: the longest fitted distance (long lens, 4:3) is under 6. */
const FAR_DIAGONALS = 10;
/** The zoom-out limit as a share of the far plane, so the scene's far side is still inside it from there. */
const ZOOM_OUT = 0.8;
/** The zoom-in limit (metres): close enough to read one fixture, not through it. */
const ZOOM_IN = 0.5;
/** The eye of an imported stage stays this far above the lowest point of its scene (metres). */
const FLOOR_CLEAR = 0.3;

/**
 * Sets the clip planes and the orbit limits for a scene box, or the built-in ones for null. A file may be far larger
 * than the demo venue (a 190 m stage), so the far plane and the zoom-out limit grow with the box diagonal; the near
 * plane grows by the same factor only past the built-in far plane, so a camera inside a hall of usual size still
 * clips nothing at 0.1 m. An imported stage may be seen exactly level (the front and side elevations), which the
 * built-in limit forbids.
 */
export function applyViewRange(camera: PerspectiveCamera, controls: OrbitControls, scene: StageBounds | null): void {
  const diagonal = scene
    ? Math.hypot(scene.max[0] - scene.min[0], scene.max[1] - scene.min[1], scene.max[2] - scene.min[2])
    : 0;
  const far = Math.max(FAR, FAR_DIAGONALS * diagonal);
  camera.near = (NEAR * far) / FAR;
  camera.far = far;
  camera.updateProjectionMatrix();
  controls.minDistance = scene ? ZOOM_IN : 0;
  controls.maxDistance = scene ? ZOOM_OUT * far : Infinity;
  controls.maxPolarAngle = scene ? Math.PI / 2 : BUILT_IN_POLAR;
}

/**
 * The lowest orbit (polar angle, radians) of an imported stage for a target height and an eye distance: level, and
 * below level as far as the eye stays `FLOOR_CLEAR` above the lowest point of the scene. A person in the front rows
 * looks up at the rig (the Crowd view), which a fixed level limit forbids; this limit is never tighter than level.
 */
export function floorPolar(scene: StageBounds, targetY: number, distance: number): number {
  const drop = Math.min(0, scene.min[1] + FLOOR_CLEAR - targetY);
  return Math.acos(distance > 0 ? Math.max(-1, drop / distance) : 0);
}

/** Sets the orbit limit of an imported stage from where the camera is now; a built-in stage keeps its fixed limit. */
export function followFloor(controls: OrbitControls, scene: StageBounds | null): void {
  if (scene) controls.maxPolarAngle = floorPolar(scene, controls.target.y, controls.getDistance());
}
