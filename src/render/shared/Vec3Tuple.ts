/**
 * An [x, y, z] value: a position in metres, a box size, a per-axis scale or XYZ Euler angles in radians. It is a plain
 * readonly tuple, not a three.js `Vector3`, so the venue and model tables stay literal data that nothing can mutate.
 */
export type Vec3Tuple = readonly [x: number, y: number, z: number];
