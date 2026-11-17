import { BufferAttribute, BufferGeometry, Euler, Matrix4, Quaternion, Vector3 } from 'three';

const matrix = new Matrix4(),
  rotation = new Quaternion(),
  euler = new Euler(),
  offset = new Vector3(),
  size = new Vector3();

/**
 * A transformed, non-indexed copy of a primitive, ready to {@link merge}: scale, then rotate XYZ, then move.
 * Non-indexed because merge concatenates raw vertex arrays.
 */
export function part(
  geo: BufferGeometry,
  x = 0,
  y = 0,
  z = 0,
  sx = 1,
  sy = 1,
  sz = 1,
  rx = 0,
  ry = 0,
  rz = 0,
): BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  return g.applyMatrix4(
    matrix.compose(offset.set(x, y, z), rotation.setFromEuler(euler.set(rx, ry, rz)), size.set(sx, sy, sz)),
  );
}

/**
 * Joins parts into one geometry (position, normal, uv) and disposes the parts, so a model costs one draw call per
 * material. BufferGeometryUtils is not vendored, and this is all the models need.
 */
export function merge(parts: readonly BufferGeometry[]): BufferGeometry {
  let n = 0;
  for (const p of parts) n += p.getAttribute('position').count;
  const pos = new Float32Array(n * 3),
    nor = new Float32Array(n * 3),
    uv = new Float32Array(n * 2);
  let o = 0;
  for (const p of parts) {
    const position = p.getAttribute('position');
    pos.set(position.array, o * 3);
    nor.set(p.getAttribute('normal').array, o * 3);
    if (p.hasAttribute('uv')) uv.set(p.getAttribute('uv').array, o * 2);
    o += position.count;
    p.dispose();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('normal', new BufferAttribute(nor, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}

/**
 * The per-model geometry cache: `make` runs on the first call only, when the first fixture of that model is built,
 * and every later fixture of the model shares the result.
 */
export function once<T extends object>(make: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= make());
}
