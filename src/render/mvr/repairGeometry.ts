import { BufferAttribute, type BufferGeometry, type InterleavedBufferAttribute } from 'three';
import { repairNormals } from '../shared/index';

type Attribute = BufferAttribute | InterleavedBufferAttribute;

/** What `repairGeometry` had to change: vertex normals replaced, and triangles that no longer draw. */
export interface MeshRepair {
  readonly normals: number;
  readonly triangles: number;
}

/** The xyz values of an attribute as floats: its own array when that is one, else a copy read through it. */
function valuesOf(attribute: Attribute): Float32Array {
  if (attribute instanceof BufferAttribute && attribute.array instanceof Float32Array && attribute.itemSize === 3)
    return attribute.array;
  const values = new Float32Array(attribute.count * 3);
  for (let i = 0; i < attribute.count; i++)
    values.set([attribute.getX(i), attribute.getY(i), attribute.getZ(i)], i * 3);
  return values;
}

/** Writes the values back when `valuesOf` gave a copy, and marks the attribute for upload either way. */
function store(attribute: Attribute, values: Float32Array): void {
  if (values !== attribute.array)
    for (let i = 0; i < attribute.count; i++)
      attribute.setXYZ(i, values[i * 3] ?? 0, values[i * 3 + 1] ?? 0, values[i * 3 + 2] ?? 0);
  attribute.needsUpdate = true;
}

const isFiniteAt = (values: Float32Array, vertex: number): boolean =>
  Number.isFinite((values[vertex * 3] ?? 0) + (values[vertex * 3 + 1] ?? 0) + (values[vertex * 3 + 2] ?? 0));

/**
 * Makes every triangle that uses a NaN or infinite position draw nothing, and returns how many there were. Such a
 * vertex has no place on screen, and it turns the bounds of the mesh into NaN, so culling and the camera fit fail.
 * The triangle collapses onto the first sound vertex (a triangle without area is not rasterised) and the broken
 * positions move there too, so the buffers keep their size and layout and the bounds stay tight.
 */
function dropBrokenTriangles(geometry: BufferGeometry, position: Attribute): number {
  const values = valuesOf(position);
  const bad = new Set<number>();
  let anchor = -1;
  for (let vertex = 0; vertex < position.count; vertex++) {
    if (!isFiniteAt(values, vertex)) bad.add(vertex);
    else if (anchor < 0) anchor = vertex;
  }
  if (bad.size === 0) return 0;
  const index = geometry.getIndex();
  const at = [0, 1, 2].map((axis) => (anchor < 0 ? 0 : (values[anchor * 3 + axis] ?? 0)));
  const corners = (index ?? position).count;
  let dropped = 0;
  for (let corner = 0; corner + 2 < corners; corner += 3) {
    const triangle = [0, 1, 2].map((i) => (index ? index.getX(corner + i) : corner + i));
    if (!triangle.some((vertex) => bad.has(vertex))) continue;
    dropped += 1;
    // with an index the three corners name one sound vertex; without one the triangle's own vertices move
    if (index) triangle.forEach((_, i) => index.setX(corner + i, Math.max(anchor, 0)));
    else triangle.forEach((vertex) => bad.add(vertex));
  }
  for (const vertex of bad) values.set(at, vertex * 3);
  store(position, values);
  if (index) index.needsUpdate = true;
  if (geometry.boundingBox) geometry.computeBoundingBox();
  if (geometry.boundingSphere) geometry.computeBoundingSphere();
  return dropped;
}

/**
 * Makes the geometry of a mesh file safe to draw, in place. Every file mesh passes here (`meshPartsOf`): scenery and
 * fixture models. A NaN, zero or infinite normal becomes the normal of its faces (`repairNormals`), because one NaN
 * pixel is spread over the whole frame by a blur; a triangle with a non-finite position is dropped. A geometry
 * without normals is left as it is: its loader draws it flat shaded.
 */
export function repairGeometry(geometry: BufferGeometry): MeshRepair {
  const position = geometry.getAttribute('position');
  if (!position) return { normals: 0, triangles: 0 };
  const triangles = dropBrokenTriangles(geometry, position);
  const normal = geometry.getAttribute('normal');
  if (!normal) return { normals: 0, triangles };
  const values = valuesOf(normal);
  let order = geometry.getIndex()?.array;
  if (!order) {
    order = new Uint32Array(position.count);
    for (let i = 0; i < order.length; i++) order[i] = i;
  }
  const normals = repairNormals(valuesOf(position), values, order);
  if (normals > 0) store(normal, values);
  return { normals, triangles };
}
