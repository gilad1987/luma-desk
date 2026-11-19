import type { LookPoint } from './lookArea';
import { aimErrorDeg, reachAim, type Aimable } from './reach';

/** Degrees a key beam may miss its point and still light it: under the half angle of a key pool. */
const MISS_DEG = 8;
/** How many pools a key unit may move its point along the band before it keeps the nearest pose it can reach. */
const MAX_STEPS = 6;

/** The band as the search reads it: its centre line, its half width and the distance between two pools, in metres. */
export interface KeyRow {
  readonly cx: number;
  readonly half: number;
  readonly step: number;
}

/**
 * The key point a unit can light. A head cannot look back past its own base, so a unit that stands (beam up at rest)
 * high over the band cannot light the point under it. It then takes the same point on the other side of the centre
 * line, as cross key light, and when it cannot reach that either its point moves along the band, pool by pool, first
 * towards the centre line, until the unit reaches it. A unit and its mirror image move mirrored. With no point in reach the first point stays,
 * and the reach solver gives the nearest pose.
 */
export function reachablePoint(f: Aimable, point: LookPoint, row: KeyRow): LookPoint {
  const misses = (p: LookPoint): boolean => aimErrorDeg(f, reachAim(f, p), p) > MISS_DEG;
  if (!misses(point)) return point;
  const across: LookPoint = [2 * row.cx - point[0], point[1], point[2]];
  if (!misses(across)) return across;
  const inward = point[0] > row.cx || (point[0] === row.cx && f.pos.x > row.cx) ? -1 : 1;
  for (let k = 1; k <= MAX_STEPS; k++)
    for (const dir of [inward, -inward]) {
      const moved: LookPoint = [point[0] + dir * k * row.step, point[1], point[2]];
      if (Math.abs(moved[0] - row.cx) <= row.half && !misses(moved)) return moved;
    }
  return point;
}
