import { expect } from 'vitest';

/**
 * Fails unless `actual` is within the relative `tolerance` of `expected`. The default is 0.5 %, the limit of the
 * photometry validation table.
 */
export function expectWithin(actual: number, expected: number, tolerance = 0.005): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * tolerance);
}

/** The integral of `f` by the midpoint rule: slow and plain, so it is independent of the quadrature under test. */
export function midpoint(f: (x: number) => number, from: number, to: number, steps: number): number {
  const step = (to - from) / steps;
  let sum = 0;
  for (let i = 0; i < steps; i++) sum += f(from + (i + 0.5) * step);
  return sum * step;
}
