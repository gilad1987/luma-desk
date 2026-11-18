import { Matrix4 } from 'three';
import type { Camera } from 'three';

/** Frames a draw of the surface buffers is used at most: for what no test here sees (a move in a vertex shader). */
export const MAX_AGE = 60;
/** What a frame draws beyond the lights: nothing, the surface buffers, or one shadow map. */
export const DRAW = { none: 0, buffers: 1, tile: 2 } as const;
export type ExtraDraw = (typeof DRAW)[keyof typeof DRAW];

/**
 * Which one extra draw of the scenery a frame gets, if any. The surface buffers and a shadow map each cost a draw
 * of the scenery, and a look at rest seen from a camera at rest changes neither. A frame never gets two:
 * - the buffers at once when the camera or the size changed, as every pixel then shows another surface;
 * - the buffers at most every second frame when only the scene moved (`stamp`: a performer, a fixture head): a
 *   moving body is a small part of the frame, and its rim is one frame late at worst;
 * - else one shadow map that is out of date, so the buffers and the maps take turns while the scene moves;
 * - the buffers every `MAX_AGE` frames for what none of these shows.
 * While the camera moves the maps wait: a late shadow is the smaller fault next to a wrong normal on every edge.
 */
export class SurfaceCache {
  readonly #view = new Matrix4();
  readonly #projection = new Matrix4();
  #size = 0;
  #stamp = Number.NaN;
  #age = MAX_AGE;
  #wasBuffers = false;

  /** The extra draw of this frame. When it is the buffers, the state of this frame is the one they are drawn for. */
  plan(
    camera: Camera,
    size: { readonly width: number; readonly height: number },
    stamp: number,
    isTilePending: boolean,
  ): ExtraDraw {
    const area = size.width * 16384 + size.height;
    const isView =
      area !== this.#size ||
      !camera.matrixWorld.equals(this.#view) ||
      !camera.projectionMatrix.equals(this.#projection);
    const isOld = stamp !== this.#stamp || this.#age >= MAX_AGE;
    this.#age++;
    let draw: ExtraDraw = DRAW.none;
    if (isView || (isOld && !this.#wasBuffers)) draw = DRAW.buffers;
    else if (isTilePending) draw = DRAW.tile;
    this.#wasBuffers = draw === DRAW.buffers;
    if (draw !== DRAW.buffers) return draw;
    this.#age = 1;
    this.#size = area;
    this.#stamp = stamp;
    this.#view.copy(camera.matrixWorld);
    this.#projection.copy(camera.projectionMatrix);
    return draw;
  }
}
