import type { Quat, Vec3 } from '../../domain/stage/types';
import { transformBox, type Aabb, type Point3 } from './Aabb';
import { multiply, transformPoint, type Mat4 } from './Mat4';
import { rotationColumns } from './rotationColumns';

/** Builds a matrix from its non-zero entries as `[row, col, value]`, which keeps the axis matrices readable. */
function fromEntries(entries: readonly (readonly [number, number, number])[]): Mat4 {
  const m = new Float64Array(16);
  for (const [row, col, value] of entries) m[col * 4 + row] = value;
  return m;
}

/** C = rotX(-90°)·scale(0.001): MVR (mm, Z up) to three (m, Y up). MVR (x, y, z) becomes (x, z, -y) / 1000. */
const MVR_TO_THREE = fromEntries([
  [0, 0, 0.001],
  [1, 2, 0.001],
  [2, 1, -0.001],
  [3, 3, 1],
]);

/** C⁻¹: three (m, Y up) back to MVR (mm, Z up); glTF meshes are Y up in metres and need it. */
const THREE_TO_MVR = fromEntries([
  [0, 0, 1000],
  [1, 2, -1000],
  [2, 1, 1000],
  [3, 3, 1],
]);

/**
 * C as a fresh matrix. Render bakes it into a 3DS mesh (mm, Z up) so that the mesh, like a glTF one, is in the three
 * frame, and `toThree` then places both; a copy, so no caller can change the import's own C.
 */
export function mvrToThreeMatrix(): Mat4 {
  return MVR_TO_THREE.slice();
}

/**
 * An MVR transform in the three frame: C·M·C⁻¹. The conjugation keeps the meaning "local to world", so a fixture's
 * local rest beam (MVR -Z) becomes three's -Y, which is the hanging rest pose of the desk's aim code.
 */
export function toThree(m: Mat4): Mat4 {
  return multiply(MVR_TO_THREE, multiply(m, THREE_TO_MVR));
}

/**
 * The inverse of `toThree`: C⁻¹·T·C turns a three transform (m, Y up) back into an MVR matrix (mm, Z up). It uses
 * the same two constants as the import, so an export followed by an import cannot drift by a second, slightly
 * different C.
 */
export function fromThree(m: Mat4): Mat4 {
  return multiply(THREE_TO_MVR, multiply(m, MVR_TO_THREE));
}

/** An MVR point (mm, Z up) in three metres, Y up, before the fit offset. */
export function pointToThree(p: Point3): Vec3 {
  return transformPoint(MVR_TO_THREE, p);
}

/** An MVR box (mm, Z up) in three metres, Y up, before the fit offset. */
export function boxToThree(box: Aabb): Aabb {
  return transformBox(box, MVR_TO_THREE);
}

/** A glTF box (m, Y up) in the MVR frame (mm, Z up), so GLB and 3DS bounds share one frame. */
export function boxFromThree(box: Aabb): Aabb {
  return transformBox(box, THREE_TO_MVR);
}

/**
 * The unit quaternion `[x, y, z, w]` of the rotation in `m` (Shepperd's method, as three.js uses), so the design can
 * store a fixture's orientation. A degenerate matrix gives the identity, which is the rest pose.
 */
export function quaternionOf(m: Mat4): Quat {
  const cols = rotationColumns(m);
  if (!cols) return [0, 0, 0, 1];
  const [[m00, m10, m20], [m01, m11, m21], [m02, m12, m22]] = cols;
  const trace = m00 + m11 + m22;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    return [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s];
  }
  if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  }
  if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  }
  const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
  return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
}
