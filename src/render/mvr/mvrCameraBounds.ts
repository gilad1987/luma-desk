import { boundsOf } from '../../domain/stage/bounds';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { StageBounds, Vec3 } from '../../domain/stage/types';
import type { MvrGeometry } from '../../mvr/index';

const lowest = (a: Vec3, b: Vec3): Vec3 => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])];
const highest = (a: Vec3, b: Vec3): Vec3 => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];

/**
 * The box the camera views fit to for an imported stage: the design's bounds joined with the MVR scenery's. The
 * design alone misses a set that reaches past the trusses; the scenery alone misses parts the desk added later.
 */
export function mvrCameraBounds(design: StageDesign, geometry: MvrGeometry): StageBounds {
  const own = boundsOf(design);
  return { min: lowest(own.min, geometry.bounds.min), max: highest(own.max, geometry.bounds.max) };
}
