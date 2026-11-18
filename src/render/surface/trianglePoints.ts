import { Mesh, type BufferGeometry, type Object3D } from 'three';

/** A typed guard: `instanceof Mesh` alone narrows to `Mesh<any, any>` and lets an unchecked geometry in. */
export function isMesh(node: Object3D): node is Mesh<BufferGeometry> {
  return node instanceof Mesh;
}

/** The corners of every triangle of a geometry, nine floats per triangle, with the index resolved. */
export function trianglePoints(geometry: BufferGeometry): Float32Array {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const corners = index ? index.count : position.count;
  const points = new Float32Array((corners - (corners % 3)) * 3);
  for (let i = 0; i < points.length / 3; i++) {
    const vertex = index ? index.getX(i) : i;
    points[i * 3] = position.getX(vertex);
    points[i * 3 + 1] = position.getY(vertex);
    points[i * 3 + 2] = position.getZ(vertex);
  }
  return points;
}
