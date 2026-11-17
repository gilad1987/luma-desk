import { Vector3 } from 'three';

/** Where a beam ray meets a surface: the ray distance `t` and the surface normal, compared by identity. */
export interface SurfaceHit {
  readonly t: number;
  readonly normal: Readonly<Vector3>;
}

/**
 * The LED screen plane faces the audience; the fixture sync tells a screen hit by this exact object.
 *
 * Shared identity object: never mutate it. Hits are sorted by `normal === SCREEN_NORMAL`, and a copy or a changed
 * value would silently move screen hits into the wrong light bucket.
 */
export const SCREEN_NORMAL: Readonly<Vector3> = new Vector3(0, 0, 1);
