/** A closed interval on one world axis, in metres. */
export interface AxisRange {
  readonly lo: number;
  readonly hi: number;
}

/** Tukey's fence factor: a value more than 1.5 interquartile ranges past a quartile counts as a far outlier. */
const FENCE = 1.5;

/** The `q` quantile of ascending `sorted` values, interpolated between the two nearest ranks. */
function quantile(sorted: readonly number[], q: number): number {
  const at = (sorted.length - 1) * q;
  const below = sorted[Math.floor(at)] ?? 0;
  const above = sorted[Math.ceil(at)] ?? below;
  return below + (above - below) * (at - Math.floor(at));
}

/**
 * The range on one axis where the main group of `values` lies: Tukey's fences, widened to cover `core`. A plot puts
 * nearly all fixtures over its stage and a few far away (follow spots at FOH, a delay tower); the fences drop those
 * few without a fixed distance, so the rule works for a club stage and a stadium alike. `core` (the deck) is always
 * main, and the spread the fences use is at least half of it: fixtures that hang on one truss line have almost no
 * spread, and plain fences would then drop the floor fixtures just in front of the deck.
 */
export function mainRange(values: readonly number[], core: AxisRange): AxisRange {
  if (values.length === 0) return core;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const reach = FENCE * Math.max(q3 - q1, (core.hi - core.lo) / 2);
  return { lo: Math.min(core.lo, q1 - reach), hi: Math.max(core.hi, q3 + reach) };
}
