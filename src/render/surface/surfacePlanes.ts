import type { Vector3 } from 'three';
import { TERRACE_NORMAL, AUDIENCE_TERRAIN } from '../../domain/audienceTerrain';
import { STAGE, UP } from '../../domain/venue';
import type { BeamHit } from './SurfaceHit';

/** Ray components closer to 0 than this count as parallel to the plane. */
export const PARALLEL_EPSILON = 1e-4;

/** Whether (x, z) lies strictly inside the stage deck outline. */
function isOverStage(x: number, z: number): boolean {
  return x > STAGE.x0 && x < STAGE.x1 && z > STAGE.z0 && z < STAGE.z1;
}

/** The hit on the sloped audience terraces, if the ray meets the slope inside the seating block. */
export function hitTerraces(origin: Vector3, direction: Vector3): BeamHit | null {
  const den = direction.y - (AUDIENCE_TERRAIN.RISE / AUDIENCE_TERRAIN.RUN) * direction.z;
  if (Math.abs(den) <= PARALLEL_EPSILON) return null;
  const t = (((origin.z - AUDIENCE_TERRAIN.Z1) * AUDIENCE_TERRAIN.RISE) / AUDIENCE_TERRAIN.RUN - origin.y) / den;
  if (!(t > 0)) return null;
  const x = origin.x + direction.x * t;
  const z = origin.z + direction.z * t;
  if (
    Math.abs(x) < AUDIENCE_TERRAIN.X &&
    z > AUDIENCE_TERRAIN.Z1 &&
    z < AUDIENCE_TERRAIN.Z1 + AUDIENCE_TERRAIN.STEPS * AUDIENCE_TERRAIN.RUN
  )
    return { t, normal: TERRACE_NORMAL };
  return null;
}

/**
 * The hit on the pool floor between the stage front and the terraces, for a downward ray. A venue rule: the floor
 * gap follows the Sultan's Pool deck outline, not the stage design's surface boxes.
 */
export function hitPoolFloor(origin: Vector3, direction: Vector3): BeamHit | null {
  const t = -origin.y / direction.y;
  const x = origin.x + direction.x * t;
  const z = origin.z + direction.z * t;
  const isOnFloor =
    !isOverStage(x, z) && Math.abs(x) < AUDIENCE_TERRAIN.X && z < AUDIENCE_TERRAIN.Z1 && z > STAGE.z0 - 6;
  return t > 0 && isOnFloor ? { t, normal: UP } : null;
}
