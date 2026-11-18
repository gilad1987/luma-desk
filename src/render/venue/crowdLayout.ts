import { AUDIENCE_TERRAIN } from '../../domain/audienceTerrain';
import { DELAY_TOWERS } from '../../domain/delayTowers';

/** One audience member's feet position and posture: 1 standing on the pool floor, 0 seated on a terrace. */
export type CrowdSpot = readonly [x: number, y: number, z: number, standing: 0 | 1];

/** Where the chairs stand and where people are. */
export interface CrowdLayout {
  /** Chair positions on the pool floor as [x, z]. */
  readonly chairs: readonly (readonly [x: number, z: number])[];
  readonly spots: readonly CrowdSpot[];
}

/** The ground height under terrace row `step` (0 is the first row behind the floor); those people stand on it. */
export type TerraceHeight = (step: number) => number;

/** Sultan's Pool: each terrace row is one step higher than the row in front of it. */
export const TIERED_GROUND: TerraceHeight = (step) => (step + 1) * AUDIENCE_TERRAIN.RISE;

/** A black box or an open field: the back rows stand on the same flat ground as the floor in front. */
export const FLAT_GROUND: TerraceHeight = () => 0;

/** True for the pool-floor aisles, the FOH area and the delay tower bases, where no chair stands. */
const isAisle = (x: number, z: number): boolean =>
  Math.abs(x) < 1.1 ||
  Math.abs(Math.abs(x) - 21) < 0.7 ||
  (Math.abs(x) < 6.5 && z > 43 && z < 51) ||
  DELAY_TOWERS.some(([tx, tz]) => Math.abs(x - tx) < 1.6 && Math.abs(z - tz) < 1.6);

/**
 * Lays out the audience: a chair grid on the pool floor (93 % of chairs taken) and people on the terraces (75 % of
 * places taken). `Math.random` runs once per chair and once per terrace place off the centre aisle, in that order.
 * `ground` gives the height of each terrace row: tiers in Sultan's Pool, flat elsewhere.
 */
export function layOutCrowd(ground: TerraceHeight): CrowdLayout {
  const chairs: [number, number][] = [];
  const spots: CrowdSpot[] = [];
  for (let z = 8.4; z < AUDIENCE_TERRAIN.Z1 - 0.8; z += 1.02)
    for (let x = -AUDIENCE_TERRAIN.X + 1.2; x <= AUDIENCE_TERRAIN.X - 1.2; x += 0.6) {
      if (isAisle(x, z)) continue;
      chairs.push([x, z]);
      if (Math.random() < 0.93) spots.push([x, 0.3, z - 0.05, 1]);
    }
  for (let k = 0; k < AUDIENCE_TERRAIN.STEPS; k++)
    for (let x = -AUDIENCE_TERRAIN.X + 1; x <= AUDIENCE_TERRAIN.X - 1; x += 0.6) {
      if (Math.abs(x) < 1.1 || Math.random() < 0.25) continue;
      spots.push([x, ground(k) + 0.05, AUDIENCE_TERRAIN.Z1 + k * AUDIENCE_TERRAIN.RUN + 0.62, 0]);
    }
  return { chairs, spots };
}
