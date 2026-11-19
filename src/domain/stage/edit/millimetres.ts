import type { StageFixture } from '../StageDesign';
import type { Vec3 } from '../types';

/**
 * `v` rounded to whole millimetres. A position field and a drag send a move of `target - current`, and
 * `current + delta` is often one ulp off the target (-39.528 + (5.473 + 39.528) is 5.472999999999999). The move ops
 * round what they store, so a typed 5.473 is stored as 5.473; 1 mm is far finer than a rig is ever placed.
 */
export function roundToMillimetre(v: Vec3): Vec3 {
  return [millimetres(v[0]), millimetres(v[1]), millimetres(v[2])];
}

/**
 * `f` with its position and its pixel line rounded to whole millimetres (`roundToMillimetre`): `moveFixtures` and
 * `moveTruss` store a moved fixture this way, so a fixture moved alone and one carried by its truss land alike.
 */
export function roundFixtureToMillimetre(f: StageFixture): StageFixture {
  const placed = { ...f, position: roundToMillimetre(f.position) };
  return f.pixel ? { ...placed, pixel: { ...f.pixel, p: roundToMillimetre(f.pixel.p) } } : placed;
}

/** `n` rounded to whole millimetres; adding 0 turns a rounded -0 into 0, so a value near zero reads and compares as 0. */
export function millimetres(n: number): number {
  return Math.round(n * 1000) / 1000 + 0;
}
