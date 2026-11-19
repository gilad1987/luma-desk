type Vector = [x: number, y: number, z: number];

/** A normal shorter than this points nowhere: it is zero, or the faces around the vertex cancelled out. */
const MIN_LENGTH = 1e-6;
/** The normal of a vertex that no face with an area uses; any unit vector shades it with a finite value. */
const UP: Vector = [0, 1, 0];

const read = (values: ArrayLike<number>, vertex: number): Vector => [
  values[vertex * 3] ?? 0,
  values[vertex * 3 + 1] ?? 0,
  values[vertex * 3 + 2] ?? 0,
];

/** True for a vector with a direction: every part finite and the length above `MIN_LENGTH`. */
function hasDirection(vector: Vector): boolean {
  const length = Math.hypot(...vector);
  return Number.isFinite(length) && length > MIN_LENGTH;
}

/** The cross product of the edges `a -> b` and `a -> c`: the face normal, twice the face area long. */
function faceNormal(a: Vector, b: Vector, c: Vector): Vector {
  const [ux, uy, uz] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const [vx, vy, vz] = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

/**
 * Gives every vertex of an indexed mesh a unit normal, in place, and returns how many it had to repair. A model file
 * can hold normals that are NaN or zero (an exporter that normalised the normal of a face without area). The shader
 * of the body material normalises the normal again, so such a triangle draws NaN pixels, and the bloom of the MVR
 * post chain blurs one NaN pixel over the whole frame: every view that had such a fixture in sight was black. A
 * broken normal becomes the mean of the faces that use the vertex, weighted by area as `computeVertexNormals` does,
 * or `UP` when none of them has an area. Sound normals are not touched.
 */
export function repairNormals(positions: Float32Array, normals: Float32Array, index: ArrayLike<number>): number {
  const broken = new Map<number, Vector>();
  for (let vertex = 0; vertex < normals.length / 3; vertex++)
    if (!hasDirection(read(normals, vertex))) broken.set(vertex, [0, 0, 0]);
  if (broken.size === 0) return 0;
  for (let corner = 0; corner + 2 < index.length; corner += 3) {
    const triangle = [index[corner] ?? 0, index[corner + 1] ?? 0, index[corner + 2] ?? 0] as const;
    if (!triangle.some((vertex) => broken.has(vertex))) continue;
    const face = faceNormal(read(positions, triangle[0]), read(positions, triangle[1]), read(positions, triangle[2]));
    if (!face.every(Number.isFinite)) continue;
    for (const vertex of triangle) {
      const sum = broken.get(vertex);
      if (!sum) continue;
      sum[0] += face[0];
      sum[1] += face[1];
      sum[2] += face[2];
    }
  }
  for (const [vertex, sum] of broken) {
    const length = Math.hypot(...sum);
    normals.set(hasDirection(sum) ? [sum[0] / length, sum[1] / length, sum[2] / length] : UP, vertex * 3);
  }
  return broken.size;
}
