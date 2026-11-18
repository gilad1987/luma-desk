/**
 * An [x, y, z] value: a position in metres, a box size, a per-axis scale or XYZ Euler angles in radians. It is a plain
 * readonly tuple, not a three.js `Vector3`, so the venue, rig and model tables stay literal data that nothing can
 * mutate. It lives in core because the domain (rig placement) and render (meshes, camera, models) both use it.
 */
export type Vec3Tuple = readonly [x: number, y: number, z: number];
