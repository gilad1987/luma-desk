import { Box3, Matrix4, type Object3D } from 'three';
import { isMesh } from '../../mvr/isMesh';

/**
 * The bounds of every mesh under `root` in the frame that `toFrame` maps world space into. A turned part counts
 * with the bounds of its own box, so the result can be a little wide; it scales exactly with a scale on `root`.
 */
export function bodyBox(root: Object3D, toFrame: Matrix4): Box3 {
  root.updateMatrixWorld(true);
  const box = new Box3(),
    part = new Box3(),
    matrix = new Matrix4();
  root.traverse((object) => {
    if (!isMesh(object)) return;
    const { geometry } = object;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox) return;
    box.union(part.copy(geometry.boundingBox).applyMatrix4(matrix.multiplyMatrices(toFrame, object.matrixWorld)));
  });
  return box;
}
