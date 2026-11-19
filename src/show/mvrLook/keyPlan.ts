import { clamp, D2R } from '../../core';
import type { Fixture } from '../../domain/Fixture';
import { FACE_HEIGHT_M, keyBandOf, keyGridOf, POOL_PITCH } from './keyGrid';
import type { LookArea, LookPoint, Placed } from './lookArea';
import { reachablePoint } from './keyReach';
import { landedOutput, poolArea } from './lookLight';

/** The key fixture fields the plan reads: the place, the hang and the type (zoom range, power). */
export type KeyUnit = Pick<Fixture, 'id' | 'pos' | 'T' | 'mount' | 'rotation'>;

/** Where the lead performer stands for the follow spots: this share of the half depth downstage of the middle. */
const LEAD_DOWNSTAGE = 0.6;
/** Metres across of a follow spot's pool: head to foot of one performer. */
const FOLLOW_POOL_M = 3;

/**
 * The key light of the look: the band area in square metres, the pool diameter and the rows of the key grid, the
 * aim point and zoom of each key unit, and the part of each unit's output that lands on the band area, which the
 * level rule (`areaBudget`) needs.
 */
export interface KeyPlan {
  readonly bandArea: number;
  readonly pool: number;
  readonly rows: number;
  readonly point: (f: KeyUnit) => LookPoint;
  readonly zoom: (f: KeyUnit) => { zoom: number };
  readonly output: (f: KeyUnit) => number;
}

const throwOf = (f: Placed, point: LookPoint): number =>
  Math.max(Math.hypot(point[0] - f.pos.x, point[1] - f.pos.y, point[2] - f.pos.z), 1e-3);

/** The beam angle in degrees that makes a pool `pool` metres across at `point`, seen from `f`; 0 for a broken place. */
function zoomFor(f: Placed, point: LookPoint, pool: number): number {
  const angle = (2 * Math.atan2(pool / 2, throwOf(f, point))) / D2R;
  return Number.isFinite(angle) ? +angle.toFixed(1) : 0;
}

/** The middle of the finite values, or no limit when there is none. */
function medianOf(values: readonly number[]): number {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? Infinity;
}

/**
 * The key plan of `key` on `area`: the grid of key points (`keyGridOf`), sized from the pool the units can make at
 * their real throw; a unit that cannot reach its point takes the nearest pool it can light (`reachablePoint`). Each
 * unit zooms to the grid's pool inside its type's zoom range, so a unit 30 m away in the house
 * does not flood the venue; its output is its type power, less the part of a pool that is bigger than the band area
 * (a far unit at its narrowest zoom).
 */
export function keyPlanOf(area: LookArea, key: readonly KeyUnit[]): KeyPlan {
  const band = keyBandOf(area);
  const widest = medianOf(key.map((f) => 2 * throwOf(f, band.centre) * Math.tan((f.T.zr[1] * D2R) / 2)));
  const { pool, rows, point: gridPoint } = keyGridOf(area, key, widest);
  const row = { cx: area.cx, half: band.width / 2, step: pool * POOL_PITCH };
  const point = (f: KeyUnit): LookPoint => reachablePoint(f, gridPoint(f), row);
  const zoomOf = (f: KeyUnit): number => clamp(zoomFor(f, point(f), pool), f.T.zr[0], f.T.zr[1]);
  return {
    bandArea: band.area,
    pool,
    rows,
    point,
    zoom: (f) => ({ zoom: zoomOf(f) }),
    output: (f) => landedOutput(f.T.power, poolArea(throwOf(f, point(f)), zoomOf(f)), band.area),
  };
}

/** The lead position both follow spots hold: centre line, downstage, at face height. */
export function leadPointOf(area: LookArea): LookPoint {
  return [area.cx, area.floor + FACE_HEIGHT_M, area.cz + area.halfDepth * LEAD_DOWNSTAGE];
}

/** The zoom of a follow spot on the lead position. */
export function followZoomOf(area: LookArea): (f: Placed) => { zoom: number } {
  return (f) => ({ zoom: zoomFor(f, leadPointOf(area), FOLLOW_POOL_M) });
}
