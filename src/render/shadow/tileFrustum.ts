import { Camera } from 'three';
import { AXIS, framePoint, LENS, RANGE, read, SIDE, TAN, UP } from './beamFrame';

/**
 * How much wider than the cone a tile is. The cone edge (`q` of length 1) lies this fraction inside the tile edge,
 * so the 2x2 filter of a sample on the edge never reads the tile of another light.
 */
export const CONE_MARGIN = 0.04;

/**
 * Metres past the lens where a tile starts to see casters. The beam hit test lets a beam pass what lies this near
 * its lens (`SceneryHit`: the fixture's own clamp, truss chord or floor plate), so a shadow from there would cut a
 * beam that the desk draws as free; the caster test uses the same distance. It also keeps a light clear of its
 * own body (`BodyCasters`).
 */
export const NEAR_CLEAR = 0.5;

/** The least depth of a frustum in metres, for a beam that ends inside the clear distance. */
const MIN_DEPTH = 0.02;

/** A camera that three.js never moves: `aimTileCamera` writes its matrices, and the renderer must not redo them. */
export function createTileCamera(): Camera {
  const camera = new Camera();
  camera.matrixAutoUpdate = false;
  camera.matrixWorldAutoUpdate = false;
  return camera;
}

/**
 * Points `camera` down a beam: the eye at the apex, the frustum the cone plus the margin, near `NEAR_CLEAR` past the lens and far
 * at the end of the beam. Nothing nearer or past the hit point is drawn. The camera looks along its -z, so its
 * x is the beam's side negated (a rotation, not a mirror: triangle winding stays); `tileMaps` carries that sign.
 * `shiftX` and `shiftY` (metres along side and up) move the eye to a point of the lens disc for a later soft shadow;
 * a sample then reads at q - shift / (z tan), and the caller must widen nothing, as the margin only covers the axis.
 */
export function aimTileCamera(camera: Camera, frame: Float64Array, shiftX = 0, shiftY = 0): void {
  const e = camera.matrixWorld.elements;
  const eye = framePoint(frame, 0, shiftX, shiftY);
  for (let i = 0; i < 3; i++) {
    e[i] = -read(frame, SIDE + i);
    e[4 + i] = read(frame, UP + i);
    e[8 + i] = -read(frame, AXIS + i);
    e[12 + i] = read(eye, i);
  }
  camera.matrix.copy(camera.matrixWorld);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  const near = read(frame, LENS) + NEAR_CLEAR;
  const far = Math.max(read(frame, RANGE), near + MIN_DEPTH);
  const half = near * read(frame, TAN) * (1 + CONE_MARGIN);
  camera.projectionMatrix.makePerspective(-half, half, half, -half, near, far);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}
