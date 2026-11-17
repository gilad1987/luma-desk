import { Vector3, type Camera } from 'three';

/** A screen area in CSS or canvas pixels, the shape `getBoundingClientRect()` returns. */
export interface ScreenRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * A world point mapped to a screen area, with the normalised device coordinates callers use to cull it. Mutable on
 * purpose: callers keep one and let `projectToScreen` overwrite it, so the per-frame label pass allocates nothing.
 */
export interface ScreenPoint {
  x: number;
  y: number;
  ndcX: number;
  ndcY: number;
  /** NDC depth; above 1 means the point is behind the far plane or the camera. */
  depth: number;
}

const projected = new Vector3();

/**
 * Projects a world position through the camera onto a screen area and writes the result into `out`, which it
 * returns. The id overlay and the box select both use it, so the label positions and the box hit test stay the same
 * maths; the caller-owned `out` keeps the 405-fixture overlay pass free of per-frame allocation.
 */
export function projectToScreen(camera: Camera, position: Vector3, rect: ScreenRect, out: ScreenPoint): ScreenPoint {
  projected.copy(position).project(camera);
  out.x = rect.left + ((projected.x + 1) / 2) * rect.width;
  out.y = rect.top + ((1 - projected.y) / 2) * rect.height;
  out.ndcX = projected.x;
  out.ndcY = projected.y;
  out.depth = projected.z;
  return out;
}
