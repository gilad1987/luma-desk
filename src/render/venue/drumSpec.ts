/** An [x, y, z] point in kit space. */
type KitPoint = readonly [x: number, y: number, z: number];

/** One drum: shell radius `r` and depth `d`, centre `at`, turn about x and z, and `front` for the logo head. */
export interface DrumSpec {
  readonly r: number;
  readonly d: number;
  readonly at: KitPoint;
  readonly tilt?: readonly [rx: number, rz: number];
  readonly front?: boolean;
}

/** One cymbal of radius `r` with its top at `at`, tilted about x and z toward the drummer. */
export interface CymbalSpec {
  readonly at: KitPoint;
  readonly r: number;
  readonly tilt: readonly [rx: number, rz: number];
}
