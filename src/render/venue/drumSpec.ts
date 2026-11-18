import type { Vec3Tuple } from '../shared';

/**
 * One drum of the kit (shell radius `r`, depth `d`, centre `at`, turn about x and z). The kit is a list of these, so
 * one builder makes every drum the same way; `front` exists because only the kick shows the logo head to the audience.
 */
export interface DrumSpec {
  readonly r: number;
  readonly d: number;
  readonly at: Vec3Tuple;
  readonly tilt?: readonly [rx: number, rz: number];
  readonly front?: boolean;
}

/**
 * One cymbal (radius `r`, top at `at`). `tilt` is required, not optional as on {@link DrumSpec}, because every cymbal
 * leans toward the drummer by its own angle.
 */
export interface CymbalSpec {
  readonly at: Vec3Tuple;
  readonly r: number;
  readonly tilt: readonly [rx: number, rz: number];
}
