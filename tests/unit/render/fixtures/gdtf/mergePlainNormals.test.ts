/**
 * Owns the normals of a merged fixture body: a model file with NaN or zero normals (seen in real GDTF models: 66
 * NaN normals on 68 triangles of a 0.24 m head) must not reach the shader, where one NaN pixel blacks the whole
 * frame through the bloom. Every normal that leaves `mergePlain` is a unit vector; sound normals stay as they are.
 */
import { BoxGeometry, BufferAttribute, BufferGeometry, Matrix4 } from 'three';
import { describe, expect, it } from 'vitest';
import { mergePlain } from '../../../../../src/render/fixtures/gdtf/mergePlain';
import { repairNormals } from '../../../../../src/render/shared/index';

const identity = new Matrix4();
const normalsOf = (geometry: BufferGeometry | undefined): number[] =>
  Array.from(geometry?.getAttribute('normal').array ?? []);
const lengths = (normals: readonly number[]): number[] =>
  Array.from({ length: normals.length / 3 }, (_, i) => Math.hypot(...normals.slice(i * 3, i * 3 + 3)));

/** A 0.24 m box whose first face (4 vertices, 2 triangles, facing +x) has the given broken normals. */
function boxWith(broken: number): BoxGeometry {
  const box = new BoxGeometry(0.24, 0.22, 0.24);
  const normal = box.getAttribute('normal');
  for (let vertex = 0; vertex < 4; vertex++) normal.setXYZ(vertex, broken, broken, broken);
  return box;
}

describe('the normals of a merged fixture body', () => {
  it.each([NaN, 0, Infinity])('replaces normals of %d by the normal of their face', (broken) => {
    const sound = normalsOf(mergePlain([{ geometry: new BoxGeometry(0.24, 0.22, 0.24), matrix: identity }]));
    const merged = normalsOf(mergePlain([{ geometry: boxWith(broken), matrix: identity }]));
    expect(merged.every(Number.isFinite)).toBe(true);
    merged.forEach((value, i) => expect(value).toBeCloseTo(sound[i] ?? NaN, 6));
  });

  it('keeps the repair in the frame of the merged body when the part is turned', () => {
    const quarter = new Matrix4().makeRotationZ(Math.PI / 2);
    const merged = normalsOf(mergePlain([{ geometry: boxWith(NaN), matrix: quarter }]));
    // the broken face looked along +x; turned a quarter about z it looks along +y
    expect(merged[0]).toBeCloseTo(0, 6);
    expect(merged[1]).toBeCloseTo(1, 6);
    expect(merged[2]).toBeCloseTo(0, 6);
  });

  it('leaves sound normals untouched and reports no repair', () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const normals = new Float32Array([0, 0, 1, 0, 0.6, 0.8, 0, 0, 1]);
    expect(repairNormals(positions, normals, [0, 1, 2])).toBe(0);
    expect(Array.from(normals)).toEqual([0, 0, 1, 0, 0.6000000238418579, 0.800000011920929, 0, 0, 1]);
  });

  it('gives a vertex that only faces without area use a unit normal', () => {
    // one real triangle and one that is a line: its third vertex has no face to take a normal from
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0]), 3));
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(12).fill(NaN), 3));
    geometry.setIndex([0, 1, 2, 0, 1, 3]);
    const merged = normalsOf(mergePlain([{ geometry, matrix: identity }]));
    expect(lengths(merged).every((length) => Math.abs(length - 1) < 1e-6)).toBe(true);
    expect(merged.slice(0, 3)).toEqual([0, 0, 1]);
    expect(merged.slice(9, 12)).toEqual([0, 1, 0]);
  });
});
