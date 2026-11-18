import type { FixtureTypeId } from '../../FixtureType';
import type { StageDesign, StageFixture } from '../StageDesign';
import { type FixturePlace, placesOnLine, placesOnTruss } from '../trussPlaces';
import type { Vec3 } from '../types';
import { defaultRole } from './defaultRole';
import { nextIdBlock } from './ids';

/** Two fixtures closer than this (metres) stand on the same spot. */
const SAME_SPOT_M = 0.2;
/** Lanes tried before the last one is kept as it is; a real truss never holds this many rows. */
const MAX_LANES = 10;

type FixtureBase = Pick<StageFixture, 'type' | 'role' | 'trussId' | 'mount'>;

/** `count` fixtures of `type` to spread evenly along the truss `trussId`. */
export interface TrussBatch {
  readonly trussId: string;
  readonly type: FixtureTypeId;
  readonly count: number;
}

/** `count` fixtures of `type` to spread evenly on the floor from `from` to `to` (world metres). */
export interface FloorRow {
  readonly type: FixtureTypeId;
  readonly count: number;
  readonly from: Vec3;
  readonly to: Vec3;
}

/**
 * Adds fixtures evenly along a truss (see `placesOnTruss`), hung, with the role `defaultRole` gives. A batch that
 * lands on fixtures already there moves one 0.4 m lane at a time until it is free, so a second batch never hides in
 * the first. Ids start at the next free block.
 * @throws RangeError when the truss is missing or `count` is not a whole number >= 1: a silent no-op hides a UI bug.
 */
export function addFixturesOnTruss(d: StageDesign, batch: TrussBatch): StageDesign {
  checkCount(batch.count);
  const truss = d.trusses.find((t) => t.id === batch.trussId);
  if (!truss) throw new RangeError(`addFixturesOnTruss: no truss with id ${batch.trussId}`);
  const places = firstFreeLane(d, (lane) => placesOnTruss(truss, batch.count, lane));
  const role = defaultRole(batch.type, truss);
  return appendFixtures(d, places, { type: batch.type, role, trussId: truss.id, mount: 'hang' });
}

/**
 * Adds a floor row, evenly spaced (see `placesOnLine`) and lane-shifted like `addFixturesOnTruss`.
 * @throws RangeError when `count` is not a whole number >= 1.
 */
export function addFloorRow(d: StageDesign, row: FloorRow): StageDesign {
  checkCount(row.count);
  const places = firstFreeLane(d, (lane) => placesOnLine(row.from, row.to, row.count, lane));
  const role = defaultRole(row.type, null);
  return appendFixtures(d, places, { type: row.type, role, trussId: null, mount: 'floor' });
}

/** True when `at` is within 0.2 m of `other`: the two count as one spot (lane shift, mirror). */
export function isSameSpot(at: Vec3, other: Vec3): boolean {
  return Math.hypot(at[0] - other[0], at[1] - other[1], at[2] - other[2]) < SAME_SPOT_M;
}

function checkCount(count: number): void {
  if (!Number.isInteger(count) || count < 1) throw new RangeError(`addFixtures: count must be >= 1, got ${count}`);
}

function firstFreeLane(d: StageDesign, placesAt: (lane: number) => FixturePlace[]): FixturePlace[] {
  const isTaken = (p: FixturePlace): boolean => d.fixtures.some((f) => isSameSpot(f.position, p.position));
  let places = placesAt(0);
  for (let lane = 1; lane < MAX_LANES && places.some(isTaken); lane += 1) places = placesAt(lane);
  return places;
}

function appendFixtures(d: StageDesign, places: FixturePlace[], base: FixtureBase): StageDesign {
  const first = nextIdBlock(d);
  const added = places.map((p, i): StageFixture => ({ id: first + i, ...base, ...p }));
  return { ...d, fixtures: [...d.fixtures, ...added] };
}
