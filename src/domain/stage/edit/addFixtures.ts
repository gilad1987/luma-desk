import { PRODUCTS } from '../../fixtureProducts';
import type { StageDesign, StageFixture } from '../StageDesign';
import { type FixturePlace, placesOnLine, placesOnTruss } from '../trussPlaces';
import type { StageTruss } from '../trussTypes';
import type { Vec3 } from '../types';
import { defaultRole } from './defaultRole';
import { nextIdBlock } from './ids';

/** Two fixtures closer than this (metres) stand on the same spot. */
const SAME_SPOT_M = 0.2;
/** Lanes tried before the last one is kept as it is; a real truss never holds this many rows. */
const MAX_LANES = 10;

type FixtureBase = Pick<StageFixture, 'type' | 'role' | 'trussId' | 'mount' | 'product'>;
type IsTaken = (p: FixturePlace) => boolean;

/** `count` fixtures of `type` to spread evenly along the truss `trussId`. */
export interface TrussBatch extends Pick<StageFixture, 'type' | 'product'> {
  readonly trussId: string;
  readonly count: number;
}

/** `count` fixtures of `type` to spread evenly on the floor from `from` to `to` (world metres). */
export interface FloorRow extends Pick<StageFixture, 'type' | 'product'> {
  readonly count: number;
  readonly from: Vec3;
  readonly to: Vec3;
}

/**
 * Adds fixtures evenly along a truss (see `placesOnTruss`), hung, with the role `defaultRole` gives. A batch that
 * lands on fixtures already there moves one 0.4 m lane at a time until it is free, so a second batch never hides in
 * the first. Ids start at the next free block. Bad input throws, because a silent no-op hides a UI bug.
 * @throws RangeError when the truss is missing, `count` is not a whole number >= 1, or `product` is not of `type`.
 */
export function addFixturesOnTruss(d: StageDesign, batch: TrussBatch): StageDesign {
  checkCount(batch.count);
  const truss = d.trusses.find((t) => t.id === batch.trussId);
  if (!truss) throw new RangeError(`addFixturesOnTruss: no truss with id ${batch.trussId}`);
  const places = firstFreeLane((lane) => placesOnTruss(truss, batch.count, lane), takenOnTruss(d, truss));
  const role = defaultRole(batch.type, truss);
  return appendFixtures(d, places, { ...unitOf(batch), role, trussId: truss.id, mount: 'hang' });
}

/**
 * Adds a floor row, evenly spaced (see `placesOnLine`) and lane-shifted like `addFixturesOnTruss`.
 * @throws RangeError when `count` is not a whole number >= 1, or `product` is not of `type` (its `base` differs).
 */
export function addFloorRow(d: StageDesign, row: FloorRow): StageDesign {
  checkCount(row.count);
  const places = firstFreeLane((lane) => placesOnLine(row.from, row.to, row.count, lane), takenSpot(d));
  const role = defaultRole(row.type, null);
  return appendFixtures(d, places, { ...unitOf(row), role, trussId: null, mount: 'floor' });
}

/** True when `at` is within 0.2 m of `other`: the two count as one spot (lane shift, mirror). */
export function isSameSpot(at: Vec3, other: Vec3): boolean {
  return Math.hypot(at[0] - other[0], at[1] - other[1], at[2] - other[2]) < SAME_SPOT_M;
}

/** The type and, only when set, the product of a batch, so a plain batch adds fixtures with no `product` key. */
function unitOf({ type, product }: Pick<StageFixture, 'type' | 'product'>): Pick<StageFixture, 'type' | 'product'> {
  if (product !== undefined && PRODUCTS[product].base !== type)
    throw new RangeError(`addFixtures: product ${product} has base ${PRODUCTS[product].base}, not type ${type}`);
  return product === undefined ? { type } : { type, product };
}

function checkCount(count: number): void {
  if (!Number.isInteger(count) || count < 1) throw new RangeError(`addFixtures: count must be >= 1, got ${count}`);
}

/** A place is taken when a fixture stands on the same spot (`isSameSpot`). */
function takenSpot(d: StageDesign): IsTaken {
  return (p) => d.fixtures.some((f) => isSameSpot(f.position, p.position));
}

/**
 * On a hung truss a place is also taken by a fixture of that truss within 0.2 m in plan (x/z), at any height: the
 * built-in rows hang lower than `HANG_DROP_M`, so a 3-D check misses them and a new batch would hang inside them. A
 * tower stacks its fixtures in height, so it keeps the 3-D check only.
 */
function takenOnTruss(d: StageDesign, truss: StageTruss): IsTaken {
  const isTakenSpot = takenSpot(d);
  if (truss.params.kind === 'tower') return isTakenSpot;
  const hung = d.fixtures.filter((f) => f.trussId === truss.id);
  const inPlan = (a: Vec3, b: Vec3): boolean => Math.hypot(a[0] - b[0], a[2] - b[2]) < SAME_SPOT_M;
  return (p) => isTakenSpot(p) || hung.some((f) => inPlan(f.position, p.position));
}

function firstFreeLane(placesAt: (lane: number) => FixturePlace[], isTaken: IsTaken): FixturePlace[] {
  let places = placesAt(0);
  for (let lane = 1; lane < MAX_LANES && places.some(isTaken); lane += 1) places = placesAt(lane);
  return places;
}

function appendFixtures(d: StageDesign, places: FixturePlace[], base: FixtureBase): StageDesign {
  const first = nextIdBlock(d, places.length);
  const added = places.map((p, i): StageFixture => ({ id: first + i, ...base, ...p }));
  return { ...d, fixtures: [...d.fixtures, ...added] };
}
