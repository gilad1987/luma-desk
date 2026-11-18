import { glbModel } from '../mesh/glbModel';
import { nodeMatrix } from '../mesh/nodeMatrix';

/** How far an axis may lean and still count as aligned: about 0.06 degrees, above float noise in a quaternion. */
const EPSILON = 1e-3;

/**
 * Whether each axis of a node matrix lies along a frame axis. A turn by a quarter or a half (the usual Y-up to Z-up
 * change of an exporter) keeps a box a box of the same size; any other turn does not.
 */
function isAxisAligned(m: ArrayLike<number>): boolean {
  return [0, 4, 8].every((start) => {
    const axis = [m[start] ?? 0, m[start + 1] ?? 0, m[start + 2] ?? 0];
    const length = Math.hypot(...axis);
    return (
      length === 0 ||
      axis.every((value) => Math.abs(value) / length < EPSILON || Math.abs(value) / length > 1 - EPSILON)
    );
  });
}

/**
 * True when a GLB has a root node that is turned off the axes: the writer baked a pose (a tilted head) into the
 * file. The GDTF model size is then the box of the turned mesh, so a fit of the mesh to that size is wrong. Only the
 * JSON chunk is read. A file that is not a readable GLB is not judged here; the mesh reader reports it.
 */
export function hasBakedPose(bytes: Uint8Array): boolean {
  try {
    const model = glbModel(bytes);
    if (model === undefined) return false;
    return model.roots.some((root) => {
      const node = model.nodes[root];
      return node !== undefined && !isAxisAligned(nodeMatrix(node));
    });
  } catch {
    return false;
  }
}
