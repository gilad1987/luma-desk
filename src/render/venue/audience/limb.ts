import type { P3, Ring } from './loft';

const sub = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: P3, b: P3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scaled = (a: P3, s: number): P3 => [a[0] * s, a[1] * s, a[2] * s];
const unit = (a: P3): P3 => scaled(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

/** `a` moved the share `t` of the way to `b`. */
export const mix = (a: P3, b: P3, t: number): P3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** One station of an arm or a leg: its centre, its half widths across the body and through it, its colour mask. */
export interface Station {
  readonly at: P3;
  readonly across: number;
  readonly through: number;
  readonly mask: number;
  /** How far the corner toward the body's middle stands out (1 = as the others): the thumb side of a hand. */
  readonly inner?: number | undefined;
}

/** The least cosine a bend is widened for: a sharper bend would grow the joint to a ball. */
const SHARPEST = 0.6;

/**
 * The rings of a limb of the body's `side` (1 right, -1 left) through `stations`. A ring is square to the mean of
 * the directions to its two neighbours, so a bent knee or elbow stays one round tube. That tilt makes the tube
 * thinner in the plane of the bend, so `through` grows by the cosine of the half bend. `across` lies along the
 * shoulder line as far as the limb allows, and the first corner points to the body's middle: a section of few sides
 * shows a flat outside, and an arm that crosses the chest does not twist.
 */
export function limbRings(stations: readonly Station[], side: 1 | -1): Ring[] {
  return stations.map((station, i) => {
    const before = stations[i - 1] ?? station;
    const after = stations[i + 1] ?? station;
    const along = unit(sub(after.at, before.at));
    const u = unit(cross(along, cross([-side, 0, 0], along)));
    const v = cross(along, u);
    const bend = before === station || after === station ? 1 : dot(along, unit(sub(after.at, station.at)));
    const through = station.through / Math.max(bend, SHARPEST);
    const inner = station.inner ?? 1;
    return {
      c: station.at,
      u: scaled(u, station.across),
      v: scaled(v, through),
      surface: (a) => [station.mask, a === 0 ? inner : 1],
    };
  });
}

/** `station` on the other side of the body when `side` is -1. */
export const onSide = (station: Station, side: 1 | -1): Station => ({
  ...station,
  at: [station.at[0] * side, station.at[1], station.at[2]],
});
