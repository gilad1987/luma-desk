import { BufferAttribute, BufferGeometry, Mesh, Vector3, type Matrix4 } from 'three';
import { MOST_FRONT_TRIANGLES } from './ledFront';

/** Corners closer than this, in metres, are one point: each face of a box keeps its own copy of its corners. */
const WELD = 1e-4;

/** The corners of the triangles of `mesh` under `world`, three numbers per corner, in triangle order. */
function cornersOf(mesh: Mesh, world: Matrix4): Float32Array {
  const position = mesh.geometry.getAttribute('position');
  const index = mesh.geometry.getIndex();
  const count = Math.floor((index ? index.count : position.count) / 3) * 3;
  const corners = new Float32Array(count * 3);
  const point = new Vector3();
  for (let i = 0; i < count; i += 1) {
    point.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(world);
    corners.set([point.x, point.y, point.z], i * 3);
  }
  return corners;
}

/** For each corner, the number of its point: corners at one place have one number. */
function pointsOf(corners: Float32Array): { ids: Int32Array; count: number } {
  const known = new Map<string, number>();
  const ids = new Int32Array(corners.length / 3);
  for (let i = 0; i < ids.length; i += 1) {
    const key = [0, 1, 2].map((k) => Math.round((corners[i * 3 + k] ?? 0) / WELD)).join(',');
    const id = known.get(key) ?? known.size;
    known.set(key, id);
    ids[i] = id;
  }
  return { ids, count: known.size };
}

/**
 * The connected parts of `mesh` under `world`: triangles that share a corner are one part. Static scenery merges
 * all meshes with one material into one mesh, so one mesh can hold several screens, each a part of its own. Each
 * part is its triangle corners in the world, as `cornersOf` gives them. A mesh above `MOST_FRONT_TRIANGLES` is one
 * part, as the face search does not read it either.
 */
export function partsOf(mesh: Mesh, world: Matrix4): Float32Array[] {
  const corners = cornersOf(mesh, world);
  if (corners.length / 9 > MOST_FRONT_TRIANGLES) return [corners];
  const { ids, count } = pointsOf(corners);
  const parent = Array.from({ length: count }, (_, i) => i);
  const find = (i: number): number => {
    let at = i;
    for (let up = parent[at] ?? at; up !== at; up = parent[at] ?? at) {
      parent[at] = parent[up] ?? up;
      at = up;
    }
    return at;
  };
  for (let i = 0; i + 2 < ids.length; i += 3) {
    const first = find(ids[i] ?? 0);
    parent[find(ids[i + 1] ?? 0)] = first;
    parent[find(ids[i + 2] ?? 0)] = first;
  }
  const parts = new Map<number, number[]>();
  for (let i = 0; i + 2 < ids.length; i += 3) {
    const root = find(ids[i] ?? 0);
    const triangles = parts.get(root) ?? [];
    triangles.push(i);
    parts.set(root, triangles);
  }
  if (parts.size < 2) return [corners];
  return [...parts.values()].map((triangles) => {
    const part = new Float32Array(triangles.length * 9);
    triangles.forEach((first, n) => part.set(corners.subarray(first * 3, first * 3 + 9), n * 9));
    return part;
  });
}

/** A mesh of one part in the world, with no transform, for the face search. */
export function partMesh(corners: Float32Array): Mesh {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(corners, 3));
  return new Mesh(geometry);
}
