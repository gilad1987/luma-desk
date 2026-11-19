import { ROW } from '../beams/packBeam';

/** Numbers in a beam frame: three unit vectors, the apex and three scalars. */
export const FRAME = 15;
/** Offsets into a frame. `SIDE`, `UP` and `AXIS` are the x, y and z of the beam's own space; `APEX` is its origin. */
export const SIDE = 0;
export const UP = 3;
export const AXIS = 6;
export const APEX = 9;
/** Metres from the apex to the lens: the beam starts there. */
export const LENS = 12;
/** Metres from the apex to the end of the beam. */
export const RANGE = 13;
/** tan of the field half angle. */
export const TAN = 14;

export const read = (values: ArrayLike<number>, at: number): number => values[at] ?? 0;

/**
 * The space the beam march works in, from one instance row (see `packBeam.ts`). It repeats `beam.vert.glsl` step for
 * step: the same reference axis, the same side and up vectors, the same virtual apex behind the lens. The march has
 * `q` (across the beam, in cone radii) and `z` (along the axis from the apex) for every sample, so a shadow map
 * drawn in this frame is read with `q` and `z` as they are.
 */
export function beamFrame(rows: ArrayLike<number>, instance: number, out: Float64Array): void {
  const at = instance * ROW;
  const ax = read(rows, at + 4);
  const ay = read(rows, at + 5);
  const az = read(rows, at + 6);
  const tan = read(rows, at + 7);
  // cross(ref, axis): ref is the world z for a beam along x, else the world x
  const alongX = Math.abs(ax) > 0.999;
  let sx = alongX ? -ay : 0;
  let sy = alongX ? ax : -az;
  let sz = alongX ? 0 : ay;
  const norm = Math.hypot(sx, sy, sz) || 1;
  sx /= norm;
  sy /= norm;
  sz /= norm;
  const lens = tan > 0 ? read(rows, at + 14) / tan : 0;
  out[SIDE] = sx;
  out[SIDE + 1] = sy;
  out[SIDE + 2] = sz;
  out[UP] = ay * sz - az * sy;
  out[UP + 1] = az * sx - ax * sz;
  out[UP + 2] = ax * sy - ay * sx;
  out[AXIS] = ax;
  out[AXIS + 1] = ay;
  out[AXIS + 2] = az;
  out[APEX] = read(rows, at) - ax * lens;
  out[APEX + 1] = read(rows, at + 1) - ay * lens;
  out[APEX + 2] = read(rows, at + 2) - az * lens;
  out[LENS] = lens;
  out[RANGE] = lens + read(rows, at + 3);
  out[TAN] = tan;
}

const POINT = new Float64Array(3);

/**
 * The world point `z` metres along the axis and (`a`, `b`) metres across the beam. The result is one shared array,
 * refilled by the next call: read it first.
 */
export function framePoint(frame: Float64Array, z: number, a: number, b: number): Float64Array {
  for (let i = 0; i < 3; i++) {
    POINT[i] = read(frame, APEX + i) + read(frame, AXIS + i) * z + read(frame, SIDE + i) * a + read(frame, UP + i) * b;
  }
  return POINT;
}
