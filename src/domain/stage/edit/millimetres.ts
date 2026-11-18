import type { Vec3 } from '../types';

/**
 * `v` rounded to whole millimetres. A position field sends a move of `target - current`, and `current + delta` is
 * often one ulp off the typed target (-39.528 + (5.473 + 39.528) is 5.472999999999999). The move ops round what they
 * store, so a typed 5.473 is stored as 5.473; 1 mm is far finer than a rig is ever placed.
 */
export function roundToMillimetre(v: Vec3): Vec3 {
  return [millimetres(v[0]), millimetres(v[1]), millimetres(v[2])];
}

/** Adding 0 turns a rounded -0 into 0, so a position near zero reads and compares as 0. */
function millimetres(n: number): number {
  return Math.round(n * 1000) / 1000 + 0;
}
