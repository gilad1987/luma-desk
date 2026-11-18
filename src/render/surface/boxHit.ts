import type { Vector3 } from 'three';
import type { SurfaceBox } from '../../domain/stage/types';
import { PARALLEL_EPSILON, isOverBox } from './surfacePlanes';

/** The ray distance to one box, or null when the ray misses it. */
type BoxDistance = (box: SurfaceBox, origin: Vector3, direction: Vector3) => number | null;

/**
 * The ray distance to a `top` box: its plane `y = max.y`, met from above strictly inside the box's x/z outline. For
 * the built-in deck box these are the legacy deck maths, operation for operation, so `t` stays bit for bit the same.
 */
function topT(box: SurfaceBox, origin: Vector3, direction: Vector3): number | null {
  const top = box.max[1];
  const t = (top - origin.y) / direction.y;
  if (!(t > 0)) return null;
  const isInside = isOverBox(box, origin.x + direction.x * t, origin.z + direction.z * t);
  return isInside && origin.y > top ? t : null;
}

/**
 * The ray distance to a `front` box: its plane `z = max.z`, met by a ray going upstage from in front of `min.z`,
 * strictly inside the box's x/y outline. For the built-in screen box these are the legacy screen maths.
 */
function frontT(box: SurfaceBox, origin: Vector3, direction: Vector3): number | null {
  if (!(direction.z < -PARALLEL_EPSILON && origin.z > box.min[2])) return null;
  const t = (box.max[2] - origin.z) / direction.z;
  if (!(t > 0)) return null;
  const x = origin.x + direction.x * t;
  const y = origin.y + direction.y * t;
  return x > box.min[0] && x < box.max[0] && y > box.min[1] && y < box.max[1] ? t : null;
}

/**
 * The nearest ray distance over the boxes, or null when the ray meets none. A plain loop, since it runs for every
 * fixture on every frame; on equal distances the first box wins.
 */
function nearestT(
  boxes: readonly SurfaceBox[],
  origin: Vector3,
  direction: Vector3,
  distance: BoxDistance,
): number | null {
  let nearest: number | null = null;
  for (const box of boxes) {
    const t = distance(box, origin, direction);
    if (t !== null && (nearest === null || t < nearest)) nearest = t;
  }
  return nearest;
}

/** The nearest `top` box distance. The caller passes only `top` boxes: `SurfaceHit` splits them by face once. */
export function nearestTopT(tops: readonly SurfaceBox[], origin: Vector3, direction: Vector3): number | null {
  return nearestT(tops, origin, direction, topT);
}

/** The nearest `front` box distance. The caller passes only `front` boxes: `SurfaceHit` splits them by face once. */
export function nearestFrontT(fronts: readonly SurfaceBox[], origin: Vector3, direction: Vector3): number | null {
  return nearestT(fronts, origin, direction, frontT);
}
