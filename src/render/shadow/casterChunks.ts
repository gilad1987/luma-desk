import { Box3, BufferAttribute, BufferGeometry, InstancedMesh, Matrix4, Mesh, Vector3, type Material } from 'three';
import { binTriangles } from './casterGrid';
import { addChunk, placed, type CasterParts } from './casterParts';
import { worldPoints } from './worldPoints';

/**
 * One depth mesh per grid cell of a scenery mesh; the grid is laid in the world (see `worldPoints`). Every chunk
 * geometry uses the source's own position attribute (so the GPU vertex buffer is shared) and one sorted index for
 * all cells, of which it draws its run; the world box of its run is what lets a light's frustum cull it. A mesh
 * inside one cell reuses the source geometry as it is.
 */
export function meshChunks(source: Mesh, material: Material, cell: number, out: CasterParts): void {
  const position = source.geometry.getAttribute('position');
  const sourceIndex = source.geometry.getIndex();
  const triangles = Math.floor((sourceIndex ? sourceIndex.count : position.count) / 3);
  if (triangles === 0) return;
  const points = worldPoints(position, source.matrixWorld);
  const { index, runs } = binTriangles(points, sourceIndex ? (i) => sourceIndex.getX(i) : (i) => i, triangles, cell);
  const sorted = runs.length > 1 ? new BufferAttribute(index, 1) : null;
  const world = new Box3();
  for (const { start, count, box } of runs) {
    let geometry = source.geometry;
    if (sorted) {
      geometry = new BufferGeometry().setIndex(sorted).setAttribute('position', position);
      geometry.setDrawRange(start, count);
      out.geometries.push(geometry);
    }
    const [x0 = 0, y0 = 0, z0 = 0, x1 = 0, y1 = 0, z1 = 0] = box;
    world.min.set(x0, y0, z0);
    world.max.set(x1, y1, z1);
    addChunk(out, placed(new Mesh(geometry, material), source), world, count / 3);
  }
  out.triangles += triangles;
  out.bytes += sorted ? index.byteLength : 0;
}

/**
 * One instanced depth mesh per grid cell of an instanced scenery mesh, on the source's geometry. A placement is in
 * the cell of its centre, whole; the box of a chunk is the world box of its placements.
 */
export function instancedChunks(source: InstancedMesh, material: Material, cell: number, out: CasterParts): void {
  const { geometry } = source;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const local = geometry.boundingBox ?? new Box3();
  const one = new Box3();
  const centre = new Vector3();
  const matrix = new Matrix4();
  const cells = new Map<string, { ids: number[]; box: Box3 }>();
  for (let i = 0; i < source.count; i++) {
    source.getMatrixAt(i, matrix);
    // in the world, as the source may be scaled or turned; a mirrored placement: the box of all eight corners
    one.copy(local).applyMatrix4(matrix.premultiply(source.matrixWorld)).getCenter(centre);
    const key = `${Math.floor(centre.x / cell)},${Math.floor(centre.y / cell)},${Math.floor(centre.z / cell)}`;
    const group = cells.get(key) ?? { ids: [], box: new Box3() };
    cells.set(key, group);
    group.ids.push(i);
    group.box.union(one);
  }
  const corners = geometry.getIndex()?.count ?? geometry.getAttribute('position').count;
  const each = Math.floor(corners / 3);
  for (const { ids, box } of cells.values()) {
    const chunk = placed(new InstancedMesh(geometry, material, ids.length), source);
    ids.forEach((id, i) => {
      source.getMatrixAt(id, matrix);
      chunk.setMatrixAt(i, matrix);
    });
    addChunk(out, chunk, box, each * ids.length);
    out.instanced.push(chunk);
  }
  out.triangles += each * source.count;
  out.bytes += source.count * 64;
}
