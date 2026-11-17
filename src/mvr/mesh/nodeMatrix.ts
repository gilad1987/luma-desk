import { identity, type Mat4 } from '../math/Mat4';

/** The transform fields of a glTF node; all optional, as the glTF spec defines them, and `undefined` when absent. */
export interface GltfNodeTransform {
  readonly matrix?: readonly number[] | undefined;
  readonly translation?: readonly number[] | undefined;
  readonly rotation?: readonly number[] | undefined;
  readonly scale?: readonly number[] | undefined;
}

/** The rotation part of a unit quaternion as three column vectors, per the standard quaternion-to-matrix formula. */
function quatColumns([x = 0, y = 0, z = 0, w = 1]: readonly number[]): number[][] {
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w)],
    [2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w)],
    [2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)],
  ];
}

/**
 * A glTF node's local matrix: its `matrix` (already column-major, like `Mat4`) when present, else T·R·S as the glTF
 * spec composes them. Missing parts default to no move, no turn and scale 1.
 */
export function nodeMatrix(node: GltfNodeTransform): Mat4 {
  if (node.matrix?.length === 16) return Float64Array.from(node.matrix);
  const m = identity();
  const scale = node.scale ?? [1, 1, 1];
  quatColumns(node.rotation ?? [0, 0, 0, 1]).forEach((col, c) => {
    col.forEach((value, r) => {
      m[c * 4 + r] = value * (scale[c] ?? 1);
    });
  });
  const [tx = 0, ty = 0, tz = 0] = node.translation ?? [];
  m.set([tx, ty, tz], 12);
  return m;
}
