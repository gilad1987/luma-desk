/**
 * Rounds every number, so that a golden does not depend on the last bits of a float. It also turns -0 into 0,
 * because JSON cannot store -0 and a golden read back from disk always has 0.
 */
export function roundNumbers(v: unknown, digits = 6): unknown {
  if (typeof v === 'number') return Number.isFinite(v) ? +v.toFixed(digits) || 0 : String(v);
  if (Array.isArray(v)) return v.map((x) => roundNumbers(x, digits));
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, roundNumbers(x, digits)]));
  }
  return v;
}
