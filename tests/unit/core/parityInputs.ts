/** Values that break naive float code: signed zero, NaN, infinities, denormals, int32 edges and scale boundaries. */
const EDGE_NUMBERS: readonly number[] = [
  0,
  -0,
  1,
  -1,
  0.5,
  -0.5,
  0.1,
  1 / 6,
  5 / 6,
  0.9999999999999999,
  1.0000000000000002,
  2.55,
  100,
  -100,
  255,
  1e-300,
  -1e-300,
  Number.MIN_VALUE,
  Number.EPSILON,
  1e300,
  -1e300,
  Number.MAX_VALUE,
  Number.MAX_SAFE_INTEGER,
  -Number.MAX_SAFE_INTEGER,
  2 ** 31 - 1,
  -(2 ** 31),
  2 ** 32,
  2 ** 32 + 5,
  NaN,
  Infinity,
  -Infinity,
];

/** Deterministic spread of values in [-scale, scale], so a failing input can be reproduced from the report. */
function spread(count: number, scale: number): number[] {
  return Array.from({ length: count }, (_, i) => Math.sin(i * 12.9898 + scale) * scale);
}

/** The inputs every parity test runs over: the edge cases plus ordinary values at the scales the app uses. */
export const PARITY_INPUTS: readonly number[] = [
  ...EDGE_NUMBERS,
  ...spread(200, 1),
  ...spread(200, 100),
  ...spread(100, 1e6),
];

/** The fewer edge cases, for functions of three arguments where the full cross product would be too large. */
export const PARITY_INPUTS_SMALL: readonly number[] = [...EDGE_NUMBERS, ...spread(20, 1), ...spread(20, 100)];

/**
 * Runs `actual` and `oracle` (the original one-liner) on each argument list and returns the ones whose results differ
 * under `Object.is`, so NaN equals NaN and `0` differs from `-0`. Array results are compared element by element.
 */
export function parityMismatches<A extends readonly number[]>(
  argLists: readonly A[],
  actual: (...args: A) => unknown,
  oracle: (...args: A) => unknown,
): A[] {
  return argLists.filter((args) => !sameValue(actual(...args), oracle(...args)));
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
  }
  return Object.is(a, b);
}

/** Every `[a, b, c]` combination of `values`, for three-argument functions. */
export function triples(values: readonly number[]): [number, number, number][] {
  return values.flatMap((a) => values.flatMap((b) => values.map((c): [number, number, number] => [a, b, c])));
}
