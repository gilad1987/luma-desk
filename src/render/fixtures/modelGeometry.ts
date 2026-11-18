import { BufferAttribute, BufferGeometry, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { Vec3Tuple } from '../../core';

const matrix = new Matrix4(),
  quaternion = new Quaternion(),
  euler = new Euler(),
  offset = new Vector3(),
  size = new Vector3();

const ORIGIN: Vec3Tuple = [0, 0, 0];
const UNIT_SCALE: Vec3Tuple = [1, 1, 1];

/**
 * A transformed, non-indexed copy of a primitive, ready to {@link merge}: scale, then rotate XYZ, then move.
 * Non-indexed because merge concatenates raw vertex arrays.
 */
export function part(
  geo: BufferGeometry,
  position: Vec3Tuple = ORIGIN,
  scale: Vec3Tuple = UNIT_SCALE,
  rotation: Vec3Tuple = ORIGIN,
): BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  return g.applyMatrix4(
    matrix.compose(offset.set(...position), quaternion.setFromEuler(euler.set(...rotation)), size.set(...scale)),
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
