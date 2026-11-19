import { fromThree, quaternionOf, toThree } from '../../math/axes';
import { composeMatrix } from '../../math/composeMatrix';
import { identity, type Mat4 } from '../../math/Mat4';

const at = (m: Mat4, row: number, col: number): number => m[col * 4 + row] ?? 0;

/** How far the scale part may be from the identity and still count as none: float noise of the decomposition. */
const NO_SCALE = 1e-9;

/**
 * The pure rotation the import reads from a file matrix, in the MVR frame and without a translation. It takes the
 * same steps as the import (`toStageDesign`) and the pose writer (`poseMatrix`), so for a fixture the desk did not
 * turn it is the rotation of the desk pose, also when the file matrix is scaled, sheared or mirrored.
 */
export function importedRotation(world: Mat4): Mat4 {
  return fromThree(composeMatrix([0, 0, 0], quaternionOf(toThree(world))));
}

/** The 3x3 product `transpose(a) · b` when `left` is set, else `a · b`, in a matrix without translation. */
function product(a: Mat4, b: Mat4, left: boolean): Mat4 {
  const out = identity();
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cell = (k: number): number => (left ? at(a, k, row) : at(a, row, k)) * at(b, k, col);
      out[col * 4 + row] = cell(0) + cell(1) + cell(2);
    }
  }
  return out;
}

/**
 * The desk pose `next` with the scale, shear and mirror of the file's matrix `world` put back (audit B5). The file
 * matrix is the rotation the import read times a rest: `world = R · S`. The desk knows only `R`, so a move wrote the
 * new rotation alone and a fixture drawn at twice its size, or mirrored, lost that. Now the result is `R' · S` at the
 * desk position. A matrix without such a part gives `next` itself, so its text has no noise of this step.
 */
export function withScaleOf(world: Mat4, next: Mat4): Mat4 {
  const scale = product(importedRotation(world), world, true);
  const plain = identity();
  if (scale.every((value, index) => index >= 12 || Math.abs(value - (plain[index] ?? 0)) <= NO_SCALE)) return next;
  const raw = product(next, scale, false);
  // The two products leave float noise (`2.2e-16` for 0, `1.9999999999999998` for 2), which is no part of the file's
  // scale: a cell a million millionth of the largest is 0, and the rest keeps 15 digits.
  const top = Math.max(...raw.slice(0, 11).map(Math.abs));
  const out = raw.map((value) => (Math.abs(value) < top * 1e-12 ? 0 : Number(value.toPrecision(15))));
  out.set([at(next, 0, 3), at(next, 1, 3), at(next, 2, 3), 1], 12);
  return out;
}
