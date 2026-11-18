import { Quaternion, Vector3 } from 'three';
import type { Transform, Vec3 } from '../../domain/stage/types';

/**
 * Moves a truss-local point into the world: turned by the transform rotation, then moved to its position. Without a
 * rotation it only adds, so the template trusses (identity transform, world points in their params) keep the exact
 * floats of the legacy scene.
 */
export function worldPoint({ position, rotation }: Transform, p: Vec3): Vec3 {
  if (!rotation) return [p[0] + position[0], p[1] + position[1], p[2] + position[2]];
  const v = new Vector3(...p).applyQuaternion(new Quaternion(...rotation)).add(new Vector3(...position));
  return [v.x, v.y, v.z];
}
