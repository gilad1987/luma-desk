import { Matrix4 } from 'three';
import type { Mat4 } from '../../../mvr/math/Mat4';

/** GDTF is Z up and the app is Y up: (x, y, z) becomes (x, z, -y). Pan (GDTF Z) lands on Y; tilt stays on X. */
const TO_APP = new Matrix4().makeRotationX(-Math.PI / 2);
const FROM_APP = new Matrix4().makeRotationX(Math.PI / 2);

/** A GDTF `Position` (column-major, metres, relative to the parent part) as the same placement in the app frame. */
export function toAppMatrix(position: Mat4): Matrix4 {
  return new Matrix4().fromArray(position).premultiply(TO_APP).multiply(FROM_APP);
}
