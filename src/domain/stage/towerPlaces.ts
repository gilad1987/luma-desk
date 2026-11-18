import type { Vec3 } from './types';

/** How far (metres) a tower fixture stands beside the column, toward the stage centre, so it does not sit inside it. */
const TOWER_STEP_M = 0.4;

/**
 * The world places of one tower, spread evenly from its `a` to its `b`, moved by one step so all stand on one side of
 * the column. The step is chosen once for the whole tower, from its world centre (the mean of its places): a tilted
 * tower that leans across x = 0 would otherwise split, half its fixtures stepping in x and half downstage. The step
 * goes toward x = 0, or downstage (+z) for a tower closer to x = 0 than one step, so no fixture crosses the centre
 * line; never inside the column. A later lane moves `laneM` metres further: downstage on top of a downstage step, as
 * an upstage lane would undo that step and put the fixtures back in the column; upstage beside a step in x.
 */
export function besideColumn<P extends { readonly position: Vec3 }>(places: readonly P[], laneM: number): P[] {
  const x = places.reduce((sum, p) => sum + p.position[0], 0) / places.length;
  const isNearCentreLine = Math.abs(x) < TOWER_STEP_M;
  // a negative lane would shorten the downstage step and reach into the column
  const lane = Math.max(0, laneM);
  const step: Vec3 = isNearCentreLine ? [0, 0, TOWER_STEP_M + lane] : [-Math.sign(x) * TOWER_STEP_M, 0, -lane];
  return places.map((p) => ({ ...p, position: [p.position[0] + step[0], p.position[1], p.position[2] + step[2]] }));
}
