import { BufferAttribute, BufferGeometry, Matrix3, Vector3, type Matrix4 } from 'three';
import { repairNormals } from '../../shared/index';

/** A geometry and the transform that puts it in the frame it is merged into. */
export interface PlacedGeometry {
  readonly geometry: BufferGeometry;
  readonly matrix: Matrix4;
}

/** The triangles a geometry draws; zero for a geometry without positions. */
export function trianglesOf(geometry: BufferGeometry): number {
  return Math.floor(((geometry.getIndex() ?? geometry.getAttribute('position'))?.count ?? 0) / 3);
}

/** The geometry itself when it has normals, else a copy with smooth normals, so the source stays untouched. */
function withNormals(geometry: BufferGeometry): BufferGeometry {
  if (geometry.getAttribute('normal')) return geometry;
  const copy = geometry.clone();
  copy.computeVertexNormals();
  return copy;
}

/**
 * Merges parts into one indexed geometry of positions and normals only. Every fixture body is drawn in the fixture's
 * own plain material, so UVs, colours and material groups have no use, and dropping them lets parts of any file
 * format merge into one draw call. Each part keeps its vertices and its index (a part without one gets a plain one),
 * so a vertex that triangles share is stored once, not up to three times. Values are read through the attribute, so
 * interleaved and quantized glTF buffers work too. Undefined when the parts hold no triangle.
 */
export function mergePlain(parts: readonly PlacedGeometry[]): BufferGeometry | undefined {
  const drawn = parts.filter(({ geometry }) => trianglesOf(geometry) > 0);
  let vertices = 0,
    corners = 0;
  for (const { geometry } of drawn) {
    vertices += geometry.getAttribute('position').count;
    corners += (geometry.getIndex() ?? geometry.getAttribute('position')).count;
  }
  if (corners === 0) return undefined;
  const positions = new Float32Array(vertices * 3),
    normals = new Float32Array(vertices * 3),
    index = vertices > 0xffff ? new Uint32Array(corners) : new Uint16Array(corners),
    point = new Vector3(),
    turn = new Matrix3();
  let base = 0,
    slot = 0;
  for (const { geometry, matrix } of drawn) {
    const source = withNormals(geometry),
      own = source.getIndex(),
      position = source.getAttribute('position'),
      normal = source.getAttribute('normal');
    turn.getNormalMatrix(matrix);
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(matrix);
      positions.set([point.x, point.y, point.z], (base + i) * 3);
      point.fromBufferAttribute(normal, i).applyMatrix3(turn).normalize();
      normals.set([point.x, point.y, point.z], (base + i) * 3);
    }
    const count = (own ?? position).count;
    for (let i = 0; i < count; i++) index[slot++] = base + (own ? own.getX(i) : i);
    base += position.count;
  }
  // a NaN or zero normal of the file would draw NaN pixels, which the bloom spreads over the frame (`repairNormals`)
  repairNormals(positions, normals, index);
  const merged = new BufferGeometry();
  merged.setAttribute('position', new BufferAttribute(positions, 3));
  merged.setAttribute('normal', new BufferAttribute(normals, 3));
  merged.setIndex(new BufferAttribute(index, 1));
  return merged;
}
