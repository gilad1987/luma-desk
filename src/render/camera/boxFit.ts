import type { Vec3Tuple } from '../../core';
import type { StageBounds } from '../../domain/stage/types';
import { FIT_MARGIN, type ViewFrame } from './viewFrame';

export const sub = (a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a: Vec3Tuple, b: Vec3Tuple): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** The vector with length 1; a zero vector looks upstage, so a caller never divides by zero. */
export function unit(v: Vec3Tuple): Vec3Tuple {
  const length = Math.hypot(v[0], v[1], v[2]);
  return length > 0 ? [v[0] / length, v[1] / length, v[2] / length] : [0, 0, -1];
}

/** The eight corners of a box. A fit needs all of them: the near corners of a deep box project widest. */
export function boxCorners({ min, max }: StageBounds): Vec3Tuple[] {
  const pick = (i: number): Vec3Tuple => [(i & 1 ? max : min)[0], (i & 2 ? max : min)[1], (i & 4 ? max : min)[2]];
  return [0, 1, 2, 3, 4, 5, 6, 7].map(pick);
}

/** The centre of a box. */
export function boxCentre({ min, max }: StageBounds): Vec3Tuple {
  return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
}

/** What a fit looks at: the corners that must be in frame, and the sight line `dir` through `centre`. */
export interface Sight {
  readonly corners: readonly Vec3Tuple[];
  readonly centre: Vec3Tuple;
  readonly dir: Vec3Tuple;
}

/** Each corner as metres right of, above and ahead of the centre, seen along the sight line. */
function offsets({ corners, centre, dir }: Sight): Vec3Tuple[] {
  const ahead = unit(dir);
  // The orbit controls keep the world y axis up, so the screen axes follow from the view direction alone.
  const right = unit(cross(ahead, [0, 1, 0]));
  const up = cross(right, ahead);
  return corners.map((corner) => {
    const p = sub(corner, centre);
    return [Math.abs(dot(p, right)), Math.abs(dot(p, up)), dot(p, ahead)];
  });
}

/**
 * The distance from `centre`, against the view direction `dir`, at which every corner lies inside the free rectangle
 * with `margin` on each side. For a corner at `x` right, `y` up and `z` ahead of the centre, the eye at distance `d`
 * sees it at `x / (d + z)`; this must stay below `tan.h * (1 - 2 * margin)`, and the same for `y` with `tan.v`. The
 * result is the largest `d` over both directions and all corners, so the tighter of the two fields of view decides.
 */
export function fitDistance(
  sight: Sight,
  tan: { readonly h: number; readonly v: number },
  margin = FIT_MARGIN,
): number {
  const fill = 1 - 2 * margin;
  const needs = offsets(sight).map(([x, y, z]) => Math.max(x / (tan.h * fill), y / (tan.v * fill)) - z);
  return Math.max(0, ...needs);
}

/**
 * The narrowest vertical lens (degrees) that holds every corner in the free rectangle from `distance`: the same rule
 * as `fitDistance`, solved for the lens. An eye that stands at a real place (the FOH position) keeps its perspective
 * and zooms instead of walking. A corner at or behind the eye has no such lens and gives 180.
 */
export function fitFov(sight: Sight, distance: number, frame: ViewFrame, margin = FIT_MARGIN): number {
  const fill = 1 - 2 * margin;
  const needs = offsets(sight).map(([x, y, z]) =>
    distance + z > 0 ? Math.max(x / frame.free.width, y / frame.free.height) / (distance + z) : Infinity,
  );
  return (Math.atan((Math.max(0, ...needs) * frame.height) / fill) * 360) / Math.PI;
}

/** The eye that looks along `dir` at `centre` from `distance`. */
export function eyeAt(centre: Vec3Tuple, dir: Vec3Tuple, distance: number): Vec3Tuple {
  const ahead = unit(dir);
  return [centre[0] - ahead[0] * distance, centre[1] - ahead[1] * distance, centre[2] - ahead[2] * distance];
}
