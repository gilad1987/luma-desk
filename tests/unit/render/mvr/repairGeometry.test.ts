/**
 * Owns the repair of file mesh geometry on the MVR path: no NaN, zero or infinite normal and no non-finite position
 * may reach the GPU, for scenery as for fixture models. Sound geometry stays bit for bit as the file has it.
 */
import { BoxGeometry, BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { meshPartsOf } from '../../../../src/render/mvr/meshPartsOf';
import { repairGeometry } from '../../../../src/render/mvr/repairGeometry';

const valuesOf = (geometry: BufferGeometry, name: string): number[] => Array.from(geometry.getAttribute(name).array);
const lengths = (values: readonly number[]): number[] =>
  Array.from({ length: values.length / 3 }, (_, i) => Math.hypot(...values.slice(i * 3, i * 3 + 3)));

function geometryOf(positions: readonly number[], index?: number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  if (index) geometry.setIndex(index);
  return geometry;
}

/** A box whose first face (4 vertices, 2 triangles) has the given broken normals. */
function boxWith(broken: number): BoxGeometry {
  const box = new BoxGeometry(2, 1, 3);
  for (let vertex = 0; vertex < 4; vertex++) box.getAttribute('normal').setXYZ(vertex, broken, broken, broken);
  return box;
}

describe('the repair of a file mesh', () => {
  it.each([NaN, 0, Infinity])('gives normals of %d the normal of their face', (broken) => {
    const box = boxWith(broken);
    expect(repairGeometry(box)).toEqual({ normals: 4, triangles: 0 });
    expect(valuesOf(box, 'normal')).toEqual(valuesOf(new BoxGeometry(2, 1, 3), 'normal'));
  });

  it('leaves a sound mesh untouched and reports no repair', () => {
    const box = new BoxGeometry(2, 1, 3);
    expect(repairGeometry(box)).toEqual({ normals: 0, triangles: 0 });
    expect(valuesOf(box, 'position')).toEqual(valuesOf(new BoxGeometry(2, 1, 3), 'position'));
    expect(Array.from(box.getIndex()?.array ?? [])).toEqual(
      Array.from(new BoxGeometry(2, 1, 3).getIndex()?.array ?? []),
    );
  });

  it.each([NaN, Infinity, -Infinity])('drops the indexed triangle that uses a position of %d', (broken) => {
    // two sound triangles of a quad, and a third to a vertex with no place
    const geometry = geometryOf([5, 0, 0, 6, 0, 0, 6, 1, 0, 5, 1, 0, 7, broken, 0], [0, 1, 2, 0, 2, 3, 1, 4, 2]);
    expect(repairGeometry(geometry)).toEqual({ normals: 0, triangles: 1 });
    expect(Array.from(geometry.getIndex()?.array ?? [])).toEqual([0, 1, 2, 0, 2, 3, 0, 0, 0]);
    expect(valuesOf(geometry, 'position')).toEqual([5, 0, 0, 6, 0, 0, 6, 1, 0, 5, 1, 0, 5, 0, 0]);
    geometry.computeBoundingSphere();
    expect(geometry.boundingSphere?.radius).toBeCloseTo(Math.hypot(0.5, 0.5), 6);
  });

  it('collapses the triangle of a mesh without an index, and keeps the others', () => {
    const geometry = geometryOf([5, 0, 0, 6, 0, 0, 6, 1, 0, 1, 1, 1, NaN, 2, 2, 3, 3, 3]);
    expect(repairGeometry(geometry)).toEqual({ normals: 0, triangles: 1 });
    expect(valuesOf(geometry, 'position')).toEqual([5, 0, 0, 6, 0, 0, 6, 1, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0]);
    expect(geometry.getIndex()).toBeNull();
  });

  it('draws nothing of a mesh in which no position is finite', () => {
    const geometry = geometryOf([NaN, 0, 0, 1, NaN, 0, 0, 1, Infinity], [0, 1, 2]);
    expect(repairGeometry(geometry)).toEqual({ normals: 0, triangles: 1 });
    expect(valuesOf(geometry, 'position')).toEqual(new Array<number>(9).fill(0));
  });

  it('repairs the normals around a dropped triangle to unit vectors', () => {
    const geometry = geometryOf([0, 0, 0, 1, 0, 0, 0, 1, 0, NaN, 0, 0], [0, 1, 2, 0, 1, 3]);
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(12).fill(NaN), 3));
    expect(repairGeometry(geometry)).toEqual({ normals: 4, triangles: 1 });
    expect(lengths(valuesOf(geometry, 'normal')).every((length) => Math.abs(length - 1) < 1e-6)).toBe(true);
  });
});

describe('the parts of a mesh file', () => {
  it('pass through the repair, with the dropped triangles counted on the geometry', () => {
    const broken = geometryOf([0, 0, 0, 1, 0, 0, 0, 1, 0, NaN, 0, 0], [0, 1, 2, 0, 1, 3]);
    const root = new Object3D().add(
      new Mesh(boxWith(NaN), new MeshStandardMaterial()),
      new Mesh(broken, new MeshStandardMaterial()),
    );
    const [box, part] = meshPartsOf(root, new Matrix4().makeTranslation(0, 4, 0));
    expect(valuesOf(box?.geometry ?? broken, 'normal').every(Number.isFinite)).toBe(true);
    expect(box?.geometry.userData['droppedTriangles']).toBeUndefined();
    expect(valuesOf(part?.geometry ?? broken, 'position').every(Number.isFinite)).toBe(true);
    expect(part?.geometry.userData['droppedTriangles']).toBe(1);
  });
});
