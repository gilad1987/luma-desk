import type { PerspectiveCamera } from 'three';

/**
 * The camera numbers `frameOf` reads: the aspect and the view offset. The same numbers give the same frame, so the
 * render loop compares them in place each tick and builds a frame only after one of them changed.
 */
export class FrameKey {
  /** aspect, view on (1) or off (0), full width, full height, offset x, offset y; NaN until the first camera. */
  readonly #seen = new Float64Array(6).fill(Number.NaN);

  /** Whether a number differs from the last call; the new numbers are kept, so the same camera next gives false. */
  changed(camera: PerspectiveCamera): boolean {
    const seen = this.#seen;
    const view = camera.view;
    const on = view?.enabled ? 1 : 0;
    // scalars only, no array: this runs on every render tick
    const fullWidth = view?.fullWidth ?? 0,
      fullHeight = view?.fullHeight ?? 0,
      offsetX = view?.offsetX ?? 0,
      offsetY = view?.offsetY ?? 0;
    const same =
      seen[0] === camera.aspect &&
      seen[1] === on &&
      seen[2] === fullWidth &&
      seen[3] === fullHeight &&
      seen[4] === offsetX &&
      seen[5] === offsetY;
    if (same) return false;
    seen.set([camera.aspect, on, fullWidth, fullHeight, offsetX, offsetY]);
    return true;
  }
}
