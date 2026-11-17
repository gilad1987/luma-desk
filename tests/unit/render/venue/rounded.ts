/**
 * Frozen on purpose: the venue golden was recorded with exactly `Math.round(n * 1e5) / 1e5`. The shared
 * `roundNumbers(v, 5)` uses `toFixed`, which rounds halves away from zero and folds -0 into 0, so it is not
 * bit-identical (-0.000025 gives -0.00002 here and -0.00003 there) and would change the recorded hashes.
 */
const round = (n: number): number => Math.round(n * 1e5) / 1e5;

/** Rounds every number in a JSON-like value with the frozen `round`, so two engines that agree to 5 decimals match. */
export const rounded = (value: unknown): unknown => {
  if (typeof value === 'number') return round(value);
  if (Array.isArray(value)) return value.map(rounded);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rounded(v)]));
  return value;
};
