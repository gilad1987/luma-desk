import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { addMesh } from '../../../src/render/shared';
import { withSeededRandom } from './seededRandom';

const material = new MeshBasicMaterial();

describe('addMesh', () => {
  it('adds a mesh built from the given geometry and material to the given parent', () => {
    const parent = new Group();
    const geometry = new BoxGeometry(1, 2, 3);
    const mesh = addMesh(parent, geometry, material);
    expect(parent.children).toEqual([mesh]);
    expect(mesh.geometry).toBe(geometry);
    expect(mesh.material).toBe(material);
  });

  it('applies the position and rotation like the legacy add(geo, m, x, y, z, par, rx, ry, rz)', () => {
    const mesh = addMesh(new Group(), new BoxGeometry(), material, { position: [1, 2, 3], rotation: [0.1, 0.2, 0.3] });
    expect(mesh.position.toArray()).toEqual([1, 2, 3]);
    expect(mesh.rotation.toArray()).toEqual([0.1, 0.2, 0.3, 'XYZ']);
  });

  it('without a rotation matches the legacy add, which always set the rotation (0, 0, 0 by default)', () => {
    const legacy = new Mesh(new BoxGeometry(), material);
    legacy.position.set(4, 5, 6);
    legacy.rotation.set(0, 0, 0);
    const mesh = addMesh(new Group(), new BoxGeometry(), material, { position: [4, 5, 6] });
    mesh.updateMatrix();
    legacy.updateMatrix();
    expect(mesh.matrix.toArray()).toEqual(legacy.matrix.toArray());
    expect(mesh.quaternion.toArray()).toEqual(legacy.quaternion.toArray());
  });

  it('without a placement leaves the mesh at the origin, like the legacy mk(geo, mat, par)', () => {
    const mesh = addMesh(new Group(), new BoxGeometry(), material);
    expect(mesh.position.toArray()).toEqual([0, 0, 0]);
    expect(mesh.rotation.toArray()).toEqual([0, 0, 0, 'XYZ']);
  });

  it('keeps the parent order of the children, which the SXZ scale pass indexes', () => {
    const parent = new Group();
    const first = addMesh(parent, new BoxGeometry(), material);
    const second = addMesh(parent, new BoxGeometry(), material);
    expect(parent.children).toEqual([first, second]);
  });

  it('creates the geometry, then the mesh, as box(w, h, d, mat, x, y, z) did (same uuids under seeded random)', () => {
    const scene = new Group();
    const legacy = withSeededRandom(() => {
      const m = new Mesh(new BoxGeometry(2, 3, 4), material);
      m.position.set(1, 2, 3);
      return [m.geometry.uuid, m.uuid];
    });
    const now = withSeededRandom(() => {
      const m = addMesh(scene, new BoxGeometry(2, 3, 4), material, { position: [1, 2, 3] });
      return [m.geometry.uuid, m.uuid];
    });
    expect(now).toEqual(legacy);
  });
});
