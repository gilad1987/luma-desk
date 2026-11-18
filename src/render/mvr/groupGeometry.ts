import { BufferAttribute, BufferGeometry, type InterleavedBufferAttribute } from 'three';

/** One component of a vertex; every standard attribute (position, normal, uv, colour) has at most four. */
function componentOf(source: BufferAttribute | InterleavedBufferAttribute, vertex: number, component: number): number {
  if (component === 0) return source.getX(vertex);
  if (component === 1) return source.getY(vertex);
  if (component === 2) return source.getZ(vertex);
  return source.getW(vertex);
}

/** `source` for the listed vertices only, as plain floats, so a normalized or interleaved source reads alike. */
function pickVertices(
  source: BufferAttribute | InterleavedBufferAttribute,
  vertices: readonly number[],
): BufferAttribute {
  const { itemSize } = source;
  const array = new Float32Array(vertices.length * itemSize);
  vertices.forEach((vertex, at) => {
    for (let component = 0; component < itemSize; component += 1) {
      array[at * itemSize + component] = componentOf(source, vertex, component);
    }
  });
  return new BufferAttribute(array, itemSize);
}

/** The vertex of every corner in the range, read through the index when the geometry has one. */
function cornerVertices(geometry: BufferGeometry, start: number, count: number): number[] {
  const { index } = geometry;
  const total = index?.count ?? geometry.getAttribute('position').count;
  const corners: number[] = [];
  for (let corner = start; corner < Math.min(start + count, total); corner += 1) {
    corners.push(index ? index.getX(corner) : corner);
  }
  return corners;
}

/**
 * The corners `start` to `start + count` of `geometry` (one `geometry.groups` entry) as a geometry of their own, with
 * only the vertices those corners use. A 3DS mesh draws each material group from one shared vertex list; copying the
 * whole list per group would multiply its memory by the group count. Attributes with more than four components are
 * dropped, since no mesh format this reads uses them for drawing.
 */
export function groupGeometry(geometry: BufferGeometry, start: number, count: number): BufferGeometry {
  const corners = cornerVertices(geometry, start, count);
  const newIndexOf = new Map<number, number>();
  const index = corners.map((vertex) => {
    const known = newIndexOf.get(vertex);
    if (known !== undefined) return known;
    newIndexOf.set(vertex, newIndexOf.size);
    return newIndexOf.size - 1;
  });
  const vertices = [...newIndexOf.keys()];
  const part = new BufferGeometry();
  for (const [name, source] of Object.entries(geometry.attributes)) {
    if (source.itemSize <= 4) part.setAttribute(name, pickVertices(source, vertices));
  }
  part.setIndex(index);
  return part;
}
