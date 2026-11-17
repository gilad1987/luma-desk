/**
 * Limits `v` to `[min, max]`. The plain comparisons are kept on purpose: a NaN `v` fails both tests and passes through
 * unchanged instead of becoming a bound, which is the behaviour every existing caller was written against.
 */
export function clamp(v: number, min: number, max: number): number {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

/**
 * Linear interpolation from `a` (t = 0) to `b` (t = 1). The `a + (b - a) * t` form is kept because the algebraically
 * equal `a * (1 - t) + b * t` rounds differently, and fades and rig positions must stay bit-identical.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Degrees to radians factor; fixture pan, tilt and stage angles are authored in degrees. */
export const D2R = Math.PI / 180;

/**
 * Deep copy through JSON, used to snapshot cues, presets and saved shows. The JSON round trip is the contract, not an
 * implementation detail: it drops `undefined` members, turns NaN into `null` and keeps key order, exactly like the saved
 * show format, so a copy equals what a save and load would give. A top-level `undefined` throws, as before.
 */
export function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
