/** Beams on scenery inside a group of a layer: a hidden group (the proxies toggle) lets them pass. */
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';
import { sceneryOf, wall } from './sceneryMeshes';

const UPSTAGE = new Vector3(0, 0, -1);
const EYE = new Vector3(0, 5, 0);

/** A 2 m square that faces the audience, as six plain corners without an index. */
function panel(): BufferGeometry {
  const corners = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0];
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(corners, 3));
}

describe('SurfaceHit on groups inside a layer', () => {
  it('lets a beam pass a mesh in a hidden group of a shown layer, and stops it again when shown', () => {
    const holder = new Group().add(wall(-5));
    const { surfaces } = sceneryOf([holder], [wall(-10)]);
    expect(surfaces.hit(EYE, UPSTAGE)?.t).toBeCloseTo(5, 5);
    holder.visible = false;
    expect(surfaces.hit(EYE, UPSTAGE)?.t).toBeCloseTo(10, 5);
    holder.visible = true;
    expect(surfaces.hit(EYE, UPSTAGE)?.t).toBeCloseTo(5, 5);
  });

  it('follows a hidden group two levels down and a mesh that is a layer itself', () => {
    const outer = new Group().add(new Group().add(wall(-5)));
    const { surfaces, root } = sceneryOf([outer], [wall(-10)]);
    const layerMesh = wall(-15);
    root.add(layerMesh);
    surfaces.setScenery(root);
    outer.visible = false;
    expect(surfaces.hit(EYE, UPSTAGE)?.t).toBeCloseTo(10, 5);
    if (root.children[1]) root.children[1].visible = false;
    expect(surfaces.hit(EYE, UPSTAGE)?.t).toBeCloseTo(15, 5);
    layerMesh.visible = false;
    expect(surfaces.hit(EYE, UPSTAGE)).toBeNull();
  });

  it('stops beams only on the instances below the instanced mesh count', () => {
    const mesh = new InstancedMesh(panel(), new MeshBasicMaterial(), 2);
    mesh.setMatrixAt(0, new Matrix4().makeTranslation(0, 5, -10));
    mesh.setMatrixAt(1, new Matrix4().makeTranslation(20, 5, -4));
    mesh.count = 1;
    const { surfaces } = sceneryOf([mesh]);
    expect(surfaces.hit(EYE, UPSTAGE)?.t).toBeCloseTo(10, 5);
    expect(surfaces.hit(new Vector3(20, 5, 0), UPSTAGE)).toBeNull();
  });
});
