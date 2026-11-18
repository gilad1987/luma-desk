import type { Vector3 } from 'three';
import { TERRACE_NORMAL, AUDIENCE_TERRAIN } from '../../domain/audienceTerrain';
import type { SurfaceBox } from '../../domain/stage/types';
import { STAGE, UP } from '../../domain/venue';
import type { BeamHit } from './SurfaceHit';

/** Ray components closer to 0 than this count as parallel to the plane. */
export const PARALLEL_EPSILON = 1e-4;

/** Whether (x, z) lies strictly inside a box's x/z outline; a top box hit and the pool floor gap share this test. */
export function isOverBox(box: SurfaceBox, x: number, z: number): boolean {
  return x > box.min[0] && x < box.max[0] && z > box.min[2] && z < box.max[2];
}

/** Whether (x, z) lies under any top box. A plain loop, since it runs for every fixture on every frame. */
function isUnderTops(tops: readonly SurfaceBox[], x: number, z: number): boolean {
  for (const box of tops) if (isOverBox(box, x, z)) return true;
  return false;
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
 * The hit on the pool floor between the stage front and the terraces, for a downward ray. The floor skips the x/z
 * under any `top` box (G6), so a beam beside a smaller deck lands on the floor; the built-in deck box is the
 * `STAGE` outline, so the built-in stage keeps its legacy floor gap bit for bit.
 * The floor and terraces are still Sultan's Pool for every design: tiers only for `sultans-pool` and a flat floor
 * otherwise come in a later batch (stage-builder-v2.md section 4, row at line 412).
 */
export function hitPoolFloor(origin: Vector3, direction: Vector3, tops: readonly SurfaceBox[]): BeamHit | null {
  const t = -origin.y / direction.y;
  const x = origin.x + direction.x * t;
  const z = origin.z + direction.z * t;
  const isOnFloor =
    !isUnderTops(tops, x, z) && Math.abs(x) < AUDIENCE_TERRAIN.X && z < AUDIENCE_TERRAIN.Z1 && z > STAGE.z0 - 6;
  return t > 0 && isOnFloor ? { t, normal: UP } : null;
}
