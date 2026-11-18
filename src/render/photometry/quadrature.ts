import { clamp } from '../../core';
import { finiteOr } from './finite';

/** One sample of a Gauss-Legendre rule on [-1, 1]: where to read the function and how much the value counts. */
export interface QuadraturePoint {
  readonly x: number;
  readonly weight: number;
}

/** The most points a rule gets: far above what a smooth profile needs, and a bound on the work. */
const MAX_ORDER = 512;
/** A rule depends only on its point count, so each count is solved once. */
const RULES = new Map<number, readonly QuadraturePoint[]>();

/** The Legendre polynomial P_n and its derivative at x, by the three-term recurrence. */
function legendre(order: number, x: number): { value: number; slope: number } {
  let previous = 1;
  let value = x;
  for (let k = 2; k <= order; k++) {
    const next = ((2 * k - 1) * x * value - (k - 1) * previous) / k;
    previous = value;
    value = next;
  }
  return { value, slope: (order * (x * value - previous)) / (x * x - 1) };
}

/** The root number `index` of P_n by Newton steps from the Chebyshev guess, with its weight 2 / ((1 - x^2) P'^2). */
function pointOf(order: number, index: number): QuadraturePoint {
  let x = Math.cos((Math.PI * (index + 0.75)) / (order + 0.5));
  for (let i = 0; i < 50; i++) {
    const { value, slope } = legendre(order, x);
    const step = value / slope;
    x -= step;
    if (Math.abs(step) < 1e-15) break;
  }
  const { slope } = legendre(order, x);
  return { x, weight: 2 / ((1 - x * x) * slope * slope) };
}

/**
 * The Gauss-Legendre rule with `count` points on [-1, 1]. It is exact for polynomials up to degree 2 count - 1, so
 * a smooth beam profile needs far fewer points than a rule with equal steps. Source: Golub and Welsch (1969) for the
 * rule; the roots here are found by Newton's method.
 */
export function gaussLegendre(count: number): readonly QuadraturePoint[] {
  // NaN reads as 1 point and the order stops at MAX_ORDER (Infinity would build an endless rule)
  const order = clamp(Math.floor(finiteOr(count, count > 0 ? MAX_ORDER : 1)), 1, MAX_ORDER);
  const known = RULES.get(order);
  if (known !== undefined) return known;
  const rule = Array.from({ length: order }, (_, index) => pointOf(order, index));
  RULES.set(order, rule);
  return rule;
}

/**
 * The integral of `f` from `from` to `to` by one Gauss-Legendre rule of `count` points.
 *
 * @returns the integral, in the unit of `f` times the unit of its argument; 0 when a limit is not finite (no
 *   Gauss-Legendre rule covers an infinite range) or `f` gives NaN or Infinity
 */
export function integrate(f: (x: number) => number, from: number, to: number, count: number): number {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  const half = (to - from) / 2;
  const middle = (from + to) / 2;
  let sum = 0;
  for (const point of gaussLegendre(count)) sum += point.weight * f(middle + half * point.x);
  return finiteOr(half * sum, 0);
}
