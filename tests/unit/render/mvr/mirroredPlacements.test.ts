/**
 * A mirrored placement (a matrix with a negative determinant, as a designer's "mirror" command writes it) draws with
 * its outside facing out. Baking the mirror into a merged mesh must reverse the triangle winding, and an instanced
 * mesh of mirrored placements must make the renderer flip its front face; otherwise a single-sided material shows the
 * back of every triangle, which is culled, and the mirrored copy of a screen or prop is invisible.
 */
import { BufferAttribute, BufferGeometry, Matrix4, MeshBasicMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { instancedMeshes } from '../../../../src/render/mvr/instancedMeshes.ts';
import { mergeStatic } from '../../../../src/render/mvr/mergeStatic.ts';

/** One triangle in the z = 0 plane, wound counter-clockwise seen from +z, with its normal on +z. */
function triangle(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  geometry.setIndex([0, 1, 2]);
  return geometry;
}

/** The face normal by winding, (b - a) x (c - a), of the first triangle: the side three.js draws as the front. */
function windingNormal(geometry: BufferGeometry): Vector3 {
  const position = geometry.getAttribute('position');
  const corner = (at: number) => new Vector3().fromBufferAttribute(position, geometry.index?.getX(at) ?? at);
  const [a, b, c] = [corner(0), corner(1), corner(2)];
  return new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
}

const mirror = (): Matrix4 => new Matrix4().makeScale(-1, 1, 1).setPosition(5, 0, 0);
const parts = () => [{ geometry: triangle(), material: new MeshBasicMaterial() }];

describe('mirrored placements', () => {
  it('reverses the winding when a mirror is baked into a merged mesh, so the front still faces the normal', () => {
    const [mesh] = mergeStatic([{ parts: parts(), matrix: mirror() }]);
    const geometry = mesh?.geometry ?? new BufferGeometry();
    const normal = new Vector3().fromBufferAttribute(geometry.getAttribute('normal'), 0);
    expect(windingNormal(geometry).dot(normal)).toBeGreaterThan(0);
  });

  it('keeps the winding of a merged placement that does not mirror', () => {
    const [mesh] = mergeStatic([{ parts: parts(), matrix: new Matrix4().makeTranslation(1, 2, 3) }]);
    expect(windingNormal(mesh?.geometry ?? new BufferGeometry()).z).toBeGreaterThan(0);
  });

  it('draws mirrored instances from a mirrored mesh whose world matrix gives each placement its own matrix', () => {
    const plain = new Matrix4().makeTranslation(-5, 0, 0);
    const meshes = instancedMeshes(parts(), [plain, mirror()]);
    expect(meshes.map((mesh) => mesh.count)).toEqual([1, 1]);
    const [kept, mirrored] = meshes;
    if (!kept || !mirrored) throw new Error('expected two instanced meshes');
    mirrored.updateMatrixWorld();
    expect(mirrored.matrixWorld.determinant()).toBeLessThan(0);
    const instance = new Matrix4();
    mirrored.getMatrixAt(0, instance);
    expect(mirrored.matrixWorld.clone().multiply(instance).toArray()).toEqual(mirror().toArray());
    kept.getMatrixAt(0, instance);
    expect(instance.toArray()).toEqual(plain.toArray());
  });
});
