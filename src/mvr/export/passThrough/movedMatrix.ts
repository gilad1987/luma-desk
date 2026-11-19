import { identity, multiply, type Mat4 } from '../../math/Mat4';
import { importedRotation, withScaleOf } from './keptScale';
import type { ParentFrame } from './parentFrame';
import { isIdentity, preciseMatrix, withoutLocalNoise } from './preciseMatrix';

/** Half a millimetre: well below what a desk move is, above the float noise of an import and export of one pose. */
const MOVE_MM = 0.5;
/** A tenth of a milliradian on a unit axis: below any turn the desk makes, above the noise of a quaternion trip. */
const TURN = 1e-4;

const at = (m: Mat4, row: number, col: number): number => m[col * 4 + row] ?? 0;

/** Basis column `col` scaled to unit length, so a scaled original and the unscaled desk pose compare equal. */
function axis(m: Mat4, col: number): number[] {
  const v = [at(m, 0, col), at(m, 1, col), at(m, 2, col)];
  const length = Math.hypot(...v) || 1;
  return v.map((value) => value / length);
}

/**
 * Whether the file's world matrix and the desk pose place a fixture at the same point with the same orientation. The
 * file's orientation is the rotation the import read from it, not its bare columns: a mirrored matrix has a flipped
 * column that no desk rotation has, so its columns never matched and an untouched mirrored fixture was rewritten (B5).
 */
export function samePose(world: Mat4, next: Mat4): boolean {
  if ([0, 1, 2].some((row) => Math.abs(at(world, row, 3) - at(next, row, 3)) > MOVE_MM)) return false;
  const read = importedRotation(world);
  return [0, 1, 2].every((col) => {
    const [x, y] = [axis(read, col), axis(next, col)];
    return x.every((value, row) => Math.abs(value - (y[row] ?? 0)) <= TURN);
  });
}

/** The two other rows (or columns) of a 3x3 matrix, for its minors. */
const OTHERS: readonly (readonly [number, number])[] = [
  [1, 2],
  [0, 2],
  [0, 1],
];
const others = (i: number): readonly [number, number] => OTHERS[i] ?? [0, 1];

/** The inverse of an affine matrix, or `undefined` when its 3x3 part is singular. */
export function invertAffine(m: Mat4): Mat4 | undefined {
  const cofactor = (r: number, c: number): number => {
    const [r0, r1] = others(r);
    const [c0, c1] = others(c);
    const minor = at(m, r0, c0) * at(m, r1, c1) - at(m, r0, c1) * at(m, r1, c0);
    return (r + c) % 2 === 0 ? minor : -minor;
  };
  const det = [0, 1, 2].reduce((sum, c) => sum + at(m, 0, c) * cofactor(0, c), 0);
  if (Math.abs(det) < 1e-12) return undefined;
  const out = identity();
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out[c * 4 + r] = cofactor(c, r) / det;
  for (let r = 0; r < 3; r++) {
    out[12 + r] = -[0, 1, 2].reduce((sum, k) => sum + at(out, r, k) * at(m, k, 3), 0);
  }
  return out;
}

/**
 * The new `<Matrix>` text of a fixture, or `undefined` when neither it nor a parent moved, so the original text stays
 * byte for byte. The text is local to the fixture's parent (layer, group, another fixture), so the world pose is taken
 * back into the parent's frame as it is written now. A fixture the desk did not move keeps its original world pose
 * `world` under a parent this export moved: its local matrix changes so that its place in the world does not (B2).
 * A moved fixture keeps the scale and mirror its file matrix had (`withScaleOf`). Under a parent, the noise is taken
 * off the local result, which is what the file holds: a world pose rounded first gave `1.0000000001866816`.
 */
export function movedMatrix(world: Mat4, next: Mat4, parent: ParentFrame): string | undefined {
  const moved = !samePose(world, next);
  const inverse = invertAffine(parent.world);
  if ((!moved && !parent.rewritten) || inverse === undefined) return undefined;
  const target = moved ? withScaleOf(world, next) : world;
  const local = multiply(inverse, target);
  return preciseMatrix(isIdentity(parent.world) ? local : withoutLocalNoise(local));
}

/**
 * Whether a new `<Matrix>` was due but the parent's frame has no inverse (a matrix that flattens an axis). No local
 * matrix gives a world pose under such a parent, and a world matrix written as a local one would put the fixture
 * somewhere else, so `movedMatrix` keeps the text of the file and the summary counts the fixture.
 */
export function lacksInverse(world: Mat4, next: Mat4, parent: ParentFrame): boolean {
  return (!samePose(world, next) || parent.rewritten) && invertAffine(parent.world) === undefined;
}
