import { Matrix4 } from 'three';
import type { Vec3 } from '../../domain/stage/types';
import { toThree, type MeshPlacement } from '../../mvr/index';

/**
 * The three.js world matrix of a mesh placement: T(offset)·toThree(M). `MeshLibrary` hands every mesh over in the
 * three frame (metres, Y up), so one formula places GLB and 3DS meshes alike, and `offset` is the import's fit
 * offset (`MvrGeometry.offset`), so the meshes land where the import put the fixtures.
 */
export function placementMatrix(placement: MeshPlacement, offset: Vec3): Matrix4 {
  const shift = new Matrix4().makeTranslation(offset[0], offset[1], offset[2]);
  return shift.multiply(new Matrix4().fromArray(toThree(placement.matrix)));
}
