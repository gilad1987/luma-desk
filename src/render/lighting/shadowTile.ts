import type { Matrix4, PerspectiveCamera } from 'three';
import { ROW } from '../beams/packBeam';
import { KEYS } from './KeyShadows';
import { apexDistance, MAX_RANGE } from './surfacePhotometry';

/** Pixels on the side of one shadow map. */
export const TILE = 1024;
/** The tiles of the atlas; `light.frag.glsl` names the same two numbers (a unit test compares them). */
export const COLUMNS = 4;
export const ROWS = KEYS / COLUMNS;
/** Scenery nearer to the lens than this is the fixture's own head and yoke, which must not shadow its beam. */
export const NEAR = 0.35;
/** Texels at a tile edge the light shader never reads: its four filtered reads would reach the next tile. */
export const INSET = 1.5;
/** The slot of the lens radius in a beam row (`packBeam.ts`). */
const LENS = 14;

/**
 * Puts the tile camera of `slot` at the virtual apex of its beam row in `poses`, along the beam axis. From the
 * apex the cone has one angle at every distance, so the whole cone is inside the tile from the lens on; from the
 * lens itself the rim of a narrow beam would be outside the tile for the first metres.
 */
export function aimTileCamera(camera: PerspectiveCamera, poses: Float32Array, slot: number): void {
  const at = slot * ROW;
  const x = poses[at] ?? 0;
  const y = poses[at + 1] ?? 0;
  const z = poses[at + 2] ?? 0;
  const ax = poses[at + 4] ?? 0;
  const ay = poses[at + 5] ?? -1;
  const az = poses[at + 6] ?? 0;
  const tan = poses[at + 7] ?? 0.1;
  const back = apexDistance(poses[at + LENS] ?? 0, tan);
  // a little wider than the cone: the soft edge of the light stays inside the tile
  camera.fov = (2 * Math.atan(Math.min(tan * 1.1 + 0.02, 3)) * 180) / Math.PI;
  camera.near = back + NEAR;
  camera.far = back + MAX_RANGE;
  camera.updateProjectionMatrix();
  camera.position.set(x - ax * back, y - ay * back, z - az * back);
  // a beam along the world up axis has no side from it
  camera.up.set(0, Math.abs(ay) > 0.99 ? 0 : 1, Math.abs(ay) > 0.99 ? -1 : 0);
  camera.lookAt(x + ax, y + ay, z + az);
  camera.updateMatrixWorld();
}

/** World to the place of `slot` in the atlas texture and to a depth of 0 to 1, for the camera the tile is drawn by. */
export function tileMatrix(slot: number, camera: PerspectiveCamera, out: Matrix4): Matrix4 {
  const column = slot % COLUMNS;
  const row = Math.floor(slot / COLUMNS);
  const sx = 0.5 / COLUMNS;
  const sy = 0.5 / ROWS;
  return out
    .set(sx, 0, 0, sx * (1 + 2 * column), 0, sy, 0, sy * (1 + 2 * row), 0, 0, 0.5, 0.5, 0, 0, 0, 1)
    .multiply(camera.projectionMatrix)
    .multiply(camera.matrixWorldInverse);
}

/** Whether the atlas coordinate (`u`, `v`) is a place the light shader reads the tile of `slot` at. */
export function isInTile(slot: number, u: number, v: number): boolean {
  const edge = INSET / TILE;
  const x = u * COLUMNS - (slot % COLUMNS);
  const y = v * ROWS - Math.floor(slot / COLUMNS);
  return x >= edge && x <= 1 - edge && y >= edge && y <= 1 - edge;
}
