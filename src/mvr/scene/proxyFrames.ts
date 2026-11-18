import type { Mat4 } from '../math/Mat4';
import { dot, length, sub, type V3 } from './proxyGrid';

const UP: V3 = [0, 0, 1];
const scale = (v: V3, k: number): V3 => [v[0] * k, v[1] * k, v[2] * k];
const unit = (v: V3): V3 => scale(v, 1 / length(v));
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** The matrix with these unit axes as columns and `at` as its place (column-major, as `Mat4`). */
function frame(x: V3, y: V3, z: V3, at: V3): Mat4 {
  return Float64Array.of(...x, 0, ...y, 0, ...z, 0, ...at, 1);
}

/** The grid directions at one placement: `a` to its nearest neighbour, `b` to the nearest one over 60° off `a`. */
export function gridAxes(offsets: readonly V3[]): { readonly a: V3 | undefined; readonly b: V3 | undefined } {
  const a = offsets[0];
  const b = a && offsets.find((offset) => Math.abs(dot(offset, a)) < 0.5 * length(offset) * length(a));
  return { a, b };
}

/** Whether the neighbours form a square grid in a standing plane, which is how LED tiles hang. */
export function looksLikePanel(offsets: readonly V3[]): boolean {
  const { a, b } = gridAxes(offsets);
  if (!a || !b) return false;
  const square = Math.abs(length(b) - length(a)) <= 0.2 * length(a);
  return square && Math.abs(unit(cross(a, b))[2]) < 0.3;
}

/** Whether the nearest neighbour is level and no second direction is as near: one row of seats, the next row apart. */
export function looksLikeSeat(offsets: readonly V3[]): boolean {
  const { a, b } = gridAxes(offsets);
  if (!a || Math.abs(a[2]) >= 0.2 * length(a)) return false;
  return b === undefined || length(b) >= 1.3 * length(a);
}

/**
 * A panel's frame: X and Y in the plane of its two grid directions (X the more level one, Y pointing up), Z the plane
 * normal. Nothing for a placement in a single line, as one direction does not give a plane. The sign of X follows the
 * neighbour that happened to be nearest, so it is not the same for every panel of a wall.
 */
export function panelFrame(at: V3, offsets: readonly V3[]): Mat4 | undefined {
  const { a, b } = gridAxes(offsets);
  if (!a || !b) return undefined;
  const [level, other] = Math.abs(a[2]) / length(a) <= Math.abs(b[2]) / length(b) ? [a, b] : [b, a];
  const x = unit(level);
  const normal = unit(cross(x, other));
  const y = cross(normal, x);
  return y[2] < 0 ? frame(x, scale(y, -1), scale(normal, -1), at) : frame(x, y, normal, at);
}

/**
 * A seat's frame: X along its row (the level part of the direction to the nearest seat), Z up, Y the row normal on
 * the side of `toward`. Nothing when the nearest seat is more above than beside, as that is not a row. Without
 * `toward` the side of Y is not known and stays as the row direction gives it.
 */
export function seatFrame(at: V3, offsets: readonly V3[], toward: V3 | undefined): Mat4 | undefined {
  const a = offsets[0];
  const level = a ? Math.hypot(a[0], a[1]) : 0;
  if (!a || level < 0.5 * length(a)) return undefined;
  const x: V3 = [a[0] / level, a[1] / level, 0];
  const y = cross(UP, x);
  const away = toward !== undefined && dot(y, sub(toward, at)) < 0;
  return away ? frame(scale(x, -1), scale(y, -1), UP, at) : frame(x, y, UP, at);
}
