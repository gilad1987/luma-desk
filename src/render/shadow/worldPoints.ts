import { Vector3, type BufferAttribute, type InterleavedBufferAttribute, type Matrix4 } from 'three';
import type { Points } from './casterGrid';

/**
 * The positions of a mesh in world space, for the grid only: a chunk still draws the mesh's own vertex buffer with
 * the mesh's matrix. A cell is 4 m in the space the grid is laid in, and in mesh space that holds only for a mesh
 * without a scale: an MVR mesh in millimetres (scale 0.001) got cells of 4 mm, and the cell keys ran out 8 m from
 * its origin. The copy lives for the build of one mesh.
 */
export function worldPoints(position: BufferAttribute | InterleavedBufferAttribute, matrix: Matrix4): Points {
  const world = new Float64Array(position.count * 3);
  const point = new Vector3();
  for (let v = 0; v < position.count; v++) {
    point.fromBufferAttribute(position, v).applyMatrix4(matrix);
    world[v * 3] = point.x;
    world[v * 3 + 1] = point.y;
    world[v * 3 + 2] = point.z;
  }
  return {
    getX: (v) => world[v * 3] ?? 0,
    getY: (v) => world[v * 3 + 1] ?? 0,
    getZ: (v) => world[v * 3 + 2] ?? 0,
  };
}
