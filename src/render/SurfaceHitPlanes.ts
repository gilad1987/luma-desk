import { Vector3 } from 'three';
import { TIER_N, VEN } from '../domain/audienceTerrain';
import { DECK, SCREEN, STAGE, UP } from '../domain/venue';

/** Where a beam ray meets a surface: the ray distance `t` and the surface normal, compared by identity. */
export interface SurfaceHit {
  readonly t: number;
  readonly normal: Readonly<Vector3>;
}

/** The LED screen plane faces the audience; the fixture sync tells a screen hit by this exact object. */
export const SCREEN_NORMAL: Readonly<Vector3> = new Vector3(0, 0, 1);

/** Ray components closer to 0 than this count as parallel to the plane. */
const PARALLEL_EPSILON = 1e-4;

/** Whether (x, z) lies strictly inside the stage deck outline. */
function isOverStage(x: number, z: number): boolean {
  return x > STAGE.x0 && x < STAGE.x1 && z > STAGE.z0 && z < STAGE.z1;
}

/** The hit on the sloped audience terraces, if the ray meets the slope inside the seating block. */
export function hitTerraces(origin: Vector3, direction: Vector3): SurfaceHit | null {
  const den = direction.y - (VEN.RISE / VEN.RUN) * direction.z;
  if (Math.abs(den) <= PARALLEL_EPSILON) return null;
  const t = (((origin.z - VEN.Z1) * VEN.RISE) / VEN.RUN - origin.y) / den;
  if (!(t > 0)) return null;
  const x = origin.x + direction.x * t;
  const z = origin.z + direction.z * t;
  if (Math.abs(x) < VEN.X && z > VEN.Z1 && z < VEN.Z1 + VEN.STEPS * VEN.RUN) return { t, normal: TIER_N };
  return null;
}

/** The hit on the stage deck, for a downward ray that starts above the deck. */
export function hitDeck(origin: Vector3, direction: Vector3): SurfaceHit | null {
  const t = (DECK - origin.y) / direction.y;
  if (!(t > 0)) return null;
  const x = origin.x + direction.x * t;
  const z = origin.z + direction.z * t;
  return isOverStage(x, z) && origin.y > DECK ? { t, normal: UP } : null;
}

/** The hit on the pool floor between the stage front and the terraces, for a downward ray. */
export function hitPoolFloor(origin: Vector3, direction: Vector3): SurfaceHit | null {
  const t = -origin.y / direction.y;
  const x = origin.x + direction.x * t;
  const z = origin.z + direction.z * t;
  const isOnFloor = !isOverStage(x, z) && Math.abs(x) < VEN.X && z < VEN.Z1 && z > STAGE.z0 - 6;
  return t > 0 && isOnFloor ? { t, normal: UP } : null;
}

/** The hit on the LED screen plane (with a 5 m margin each side), if it is nearer than `nearestT`. */
export function hitScreen(origin: Vector3, direction: Vector3, nearestT: number): SurfaceHit | null {
  if (!(direction.z < -PARALLEL_EPSILON && origin.z > SCREEN.z)) return null;
  const t = (SCREEN.z + 0.05 - origin.z) / direction.z;
  if (!(t > 0 && t < nearestT)) return null;
  const x = origin.x + direction.x * t;
  const y = origin.y + direction.y * t;
  const isOnScreen = x > SCREEN.x0 - 5 && x < SCREEN.x1 + 5 && y > DECK && y < 27;
  return isOnScreen ? { t, normal: SCREEN_NORMAL } : null;
}
