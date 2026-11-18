import type { StageBounds, Vec3 } from '../../domain/stage/types';
import { FAR, fileBox, outside } from '../import/importProxies';
import { isFiniteBox } from '../math/Aabb';
import { pointToThree } from '../math/axes';
import type { ProxyPlacement } from '../scene/ProxyPlacement';
import { classifyProxies } from '../scene/proxyClassify';
import type { FittedScene } from './fitScene';

/** The fitted scene as the seat area reads it: the fit offset and what the file box is made of. */
export type SeatFit = Pick<FittedScene, 'offset' | 'layers' | 'positions'>;

/**
 * The seat area of a file for the design's `mvr` block: `{ seatArea }`, the box around the floor points of the drawn
 * seats in the stage frame (metres, after the fit offset), or `{}` for a file without a seat. The seats are proxies:
 * they stay in the import's geometry, which a saved show does not hold, so the box is written into the design as
 * plain data. The camera places the Crowd view in it and the first look ends its audience fans over it, also after a
 * reload. A seat more than `FAR` m outside every mesh and fixture is a parked block (`farLayers`) and does not count,
 * and one whose matrix is not finite is left out, so the box never is NaN or endless.
 */
export function seatAreaOf(placements: readonly ProxyPlacement[], fit: SeatFit): { readonly seatArea?: StageBounds } {
  const all = fileBox(fit.layers, fit.positions);
  const points = classifyProxies(placements).flatMap(({ kind, matrix: m }): Vec3[] => {
    if (kind !== 'seat') return [];
    const [x, y, z] = pointToThree([m[12] ?? 0, m[13] ?? 0, m[14] ?? 0]);
    const point: Vec3 = [x + fit.offset[0], y + fit.offset[1], z + fit.offset[2]];
    const isParked = isFiniteBox(all) && outside(all, point) > FAR;
    return point.every(Number.isFinite) && !isParked ? [point] : [];
  });
  const [first] = points;
  if (!first) return {};
  const axis = (i: 0 | 1 | 2, pick: (a: number, b: number) => number): number =>
    points.reduce((value, point) => pick(value, point[i]), first[i]);
  return {
    seatArea: {
      min: [axis(0, Math.min), axis(1, Math.min), axis(2, Math.min)],
      max: [axis(0, Math.max), axis(1, Math.max), axis(2, Math.max)],
    },
  };
}
