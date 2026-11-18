import type { Vector3 } from 'three';
import type { SurfaceBox } from '../../domain/stage/types';
import { PARALLEL_EPSILON } from './surfacePlanes';

/**
 * The ray distance to a `top` box: its plane `y = max.y`, met from above strictly inside the box's x/z outline. For
 * the built-in deck box these are the legacy deck maths, operation for operation, so `t` stays bit for bit the same.
 */
function topT(box: SurfaceBox, origin: Vector3, direction: Vector3): number | null {
  const top = box.max[1];
  const t = (top - origin.y) / direction.y;
  if (!(t > 0)) return null;
  const x = origin.x + direction.x * t;
  const z = origin.z + direction.z * t;
  const isInside = x > box.min[0] && x < box.max[0] && z > box.min[2] && z < box.max[2];
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
 * The nearest ray distance over the `top` or the `front` boxes, or null when the ray meets none. A plain loop, since
 * it runs for every fixture on every frame; on equal distances the first box wins.
 */
export function nearestBoxT(boxes: readonly SurfaceBox[], origin: Vector3, direction: Vector3): number | null {
  let nearest: number | null = null;
  for (const box of boxes) {
    const t = box.face === 'top' ? topT(box, origin, direction) : frontT(box, origin, direction);
    if (t !== null && (nearest === null || t < nearest)) nearest = t;
  }
  return nearest;
}
