import { Vector3, type Camera } from 'three';

/** A screen area in CSS or canvas pixels, the shape `getBoundingClientRect()` returns. */
export interface ScreenRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** A world point mapped to a screen area, with the normalised device coordinates callers use to cull it. */
export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
  readonly ndcX: number;
  readonly ndcY: number;
  /** NDC depth; above 1 means the point is behind the far plane or the camera. */
  readonly depth: number;
}

const projected = new Vector3();

/**
 * Projects a world position through the camera onto a screen area. The id overlay and the box select both use it, so
 * the label positions and the box hit test stay the same maths.
 */
export function projectToScreen(camera: Camera, position: Vector3, rect: ScreenRect): ScreenPoint {
  projected.copy(position).project(camera);
  return {
    x: rect.left + ((projected.x + 1) / 2) * rect.width,
    y: rect.top + ((1 - projected.y) / 2) * rect.height,
    ndcX: projected.x,
    ndcY: projected.y,
    depth: projected.z,
  };
}
