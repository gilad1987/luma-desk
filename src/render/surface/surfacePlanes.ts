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

/** Half the side of the flat floor of a black box or an open field: wider than any deck, rig and audience. */
const FLAT_FLOOR_HALF = 200;

/** The pool floor outline: between the stage front and the terraces, as wide as the audience bowl. */
const isOnPoolFloor = (x: number, z: number): boolean =>
  Math.abs(x) < AUDIENCE_TERRAIN.X && z < AUDIENCE_TERRAIN.Z1 && z > STAGE.z0 - 6;

const isOnFlatFloor = (x: number, z: number): boolean => Math.abs(x) < FLAT_FLOOR_HALF && Math.abs(z) < FLAT_FLOOR_HALF;

/**
 * The hit on the ground plane y = 0 inside `isInside`, for a downward ray. The ground skips the x/z under any `top`
 * box (G6), so a beam beside a smaller deck lands on the ground. The predicates are module functions: this runs for
 * every fixture on every frame and makes no closure.
 */
function hitGroundPlane(
  origin: Vector3,
  direction: Vector3,
  tops: readonly SurfaceBox[],
  isInside: (x: number, z: number) => boolean,
): BeamHit | null {
  const t = -origin.y / direction.y;
  const x = origin.x + direction.x * t;
  const z = origin.z + direction.z * t;
  return t > 0 && !isUnderTops(tops, x, z) && isInside(x, z) ? { t, normal: UP } : null;
}

/**
 * The hit on the Sultan's Pool floor between the stage front and the terraces. The built-in deck box is the `STAGE`
 * outline, so the built-in stage keeps its legacy floor gap bit for bit.
 */
export function hitPoolFloor(origin: Vector3, direction: Vector3, tops: readonly SurfaceBox[]): BeamHit | null {
  return hitGroundPlane(origin, direction, tops, isOnPoolFloor);
}

/** The hit on the flat floor of a black box or an open field: y = 0 over a large square around the stage. */
export function hitFlatFloor(origin: Vector3, direction: Vector3, tops: readonly SurfaceBox[]): BeamHit | null {
  return hitGroundPlane(origin, direction, tops, isOnFlatFloor);
}
