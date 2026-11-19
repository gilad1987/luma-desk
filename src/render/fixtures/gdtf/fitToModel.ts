import { Box3, Matrix4, Vector3, type BufferGeometry } from 'three';

/**
 * The scale that fits a mesh to its GDTF `Model` size. GDTF: "the mesh is explicitly scaled to this dimension", so
 * the unit of the file does not matter (real 3DS files come in millimetres and in metres). The scale is about the
 * mesh origin, because the part is drawn around its suspension point. A size of 0 is not set: that axis takes the
 * mean factor of the set axes, so the part keeps its shape; with no size at all the mesh stays as the file has it.
 */
export function fitMatrix(geometry: BufferGeometry, size: readonly [number, number, number]): Matrix4 {
  geometry.computeBoundingBox();
  const extent = (geometry.boundingBox ?? new Box3()).getSize(new Vector3());
  // Length, Width and Height are GDTF X, Y and Z: the app axes X, Z and Y
  const pairs: readonly (readonly [number, number])[] = [
    [size[0], extent.x],
    [size[2], extent.y],
    [size[1], extent.z],
  ];
  const factors = pairs.map(([wanted, have]) => (wanted > 0 && have > 1e-9 ? wanted / have : 0));
  const set = factors.filter((factor) => factor > 0);
  const rest = set.length > 0 ? set.reduce((sum, factor) => sum + factor, 0) / set.length : 1;
  const [x = 1, y = 1, z = 1] = factors.map((factor) => factor || rest);
  return new Matrix4().makeScale(x, y, z);
}
