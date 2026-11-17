import { Vector3 } from 'three';

/** The stage deck height in metres; floor fixtures, the screen and performer marks all stand on it. */
export const DECK = 1.8;

/** The stage deck footprint in metres (x across, z from upstage to the downstage edge). */
export const STAGE = { x0: -23, x1: 23, z0: -21, z1: 0.6 } as const;

/** The LED screen wall: its plane and edges, in metres. */
export const SCREEN = { z: -20.2, x0: -17.5, x1: 17.5, y0: DECK + 1, y1: DECK + 14 } as const;

/** The five straight trusses across the stage, front to back, with their depth and height. */
export const TR = {
  front: { z: 4, y: 20 },
  t2: { z: -3.5, y: 21 },
  t3: { z: -9, y: 21 },
  t4: { z: -14, y: 21 },
  back: { z: -18.6, y: 20 },
} as const;

/** The roof grid height, which the truss towers and the hanging chains reach. */
export const ROOF = 25.5;

/** The x of the left/right truss towers (they stand at ±TOWX). */
export const TOWX = 25.5;

/** The z of the front and back truss towers. */
export const TOWZ = [4.8, -20.6] as const;

/** The circular truss: centre, outer beam radius `R`, inner wash ring radius `r2` at height `y2`. */
export const RING = { x: 0, y: 17, z: -9, R: 9, r2: 5.2, y2: 18.2 } as const;

/** The standing light towers on the deck as [x, z, height], sorted left to right then upstage first: that is id order. */
export const TOWERS: readonly (readonly [x: number, z: number, height: number])[] = [
  ...[4.5, 11, 18].flatMap((x): [number, number, number][] => [
    [-x, -16.8, 7.5],
    [x, -16.8, 7.5],
  ]),
  ...[11, 20.5].flatMap((x): [number, number, number][] => [
    [-x, -1.8, 5],
    [x, -1.8, 5],
  ]),
].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

/** One angled truss: from its outer top end `a` down to its inner end `b`, at depth `z` on side `sx` (-1 or 1). */
export interface AngledTruss {
  readonly a: Vector3;
  readonly b: Vector3;
  readonly z: number;
  readonly sx: number;
}

/** The six angled trusses flown in the air, three per side, raked toward the centre; left side first. */
export const ANG: readonly AngledTruss[] = [-1, 1].flatMap((sx) =>
  [-5.5, -12, -17.5].map((z) => ({ a: new Vector3(sx * 24.4, 23.6, z), b: new Vector3(sx * 11.8, 14.2, z), z, sx })),
);

/** The x and z scale of the band layout, shared by the band position preset and the performer props. */
export const SXZ = [1.3, 1.28] as const;

/**
 * The band member marks on stage as [x, z, extra height]; the extra height is undefined for players who stand on the
 * deck and 0.5 for those on risers, and the readers treat undefined as 0.
 */
export const BAND_PTS: readonly (readonly [x: number, z: number, lift: number | undefined])[] = (
  [
    [0, -2.5],
    [-5, -4.5],
    [5, -4.5],
    [0, -10.3, 0.5],
    [6.5, -9.1, 0.5],
    [-7.4, -6.2],
    [3.2, -6.8],
  ] as const
).map((p) => [p[0] * SXZ[0], p[1] * SXZ[1], p[2]] as const);
