/** Beams on scenery meshes: hidden layers let them pass, and every instance of a shared mesh stops them. */
import { BufferGeometry, Float32BufferAttribute, InstancedMesh, Matrix4, MeshBasicMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { sceneryOf, wall } from './sceneryMeshes';

const UPSTAGE = new Vector3(0, 0, -1);

/** A 2 m square that faces the audience, as six plain corners without an index. */
function panel(): BufferGeometry {
  const corners = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0];
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(corners, 3));
}

/** One shared panel placed three times: upstage, off to the right, and turned to face stage left's far side. */
function panels(): InstancedMesh {
  const mesh = new InstancedMesh(panel(), new MeshBasicMaterial(), 3);
  mesh.setMatrixAt(0, new Matrix4().makeTranslation(0, 5, -10));
  mesh.setMatrixAt(1, new Matrix4().makeTranslation(20, 5, -4));
  mesh.setMatrixAt(2, new Matrix4().makeRotationY(Math.PI / 2).setPosition(-8, 5, 0));
  return mesh;
}

describe('SurfaceHit on scenery layers', () => {
  it('lets a beam pass a hidden layer and follows the layer toggle for the same ray', () => {
    const { surfaces, layers, root } = sceneryOf([wall(-5)], [wall(-10)]);
    const [front] = layers;
    if (!front) throw new Error('no front layer');
    const distance = (): number | undefined => surfaces.hit(new Vector3(0, 5, 0), UPSTAGE)?.t;
    front.visible = false;
    expect(distance()).toBeCloseTo(10, 5);
    front.visible = true;
    expect(distance()).toBeCloseTo(5, 5);
    front.visible = false;
    expect(distance()).toBeCloseTo(10, 5);
    root.clear();
    expect(distance()).toBeUndefined();
  });

  it('stops beams on every instance of a shared mesh, at its own place and turn', () => {
    const { surfaces } = sceneryOf([panels()]);
    expect(surfaces.hit(new Vector3(0, 5, 0), UPSTAGE)?.t).toBeCloseTo(10, 5);
    expect(surfaces.hit(new Vector3(20, 5, 0), UPSTAGE)?.t).toBeCloseTo(4, 5);
    expect(surfaces.hit(new Vector3(10, 5, 0), UPSTAGE)).toBeNull();
    const turned = surfaces.hit(new Vector3(0, 5, 0), new Vector3(-1, 0, 0));
    expect(turned?.t).toBeCloseTo(8, 5);
    expect(turned?.normal.x).toBeCloseTo(1, 5);
    expect(turned?.normal.z).toBeCloseTo(0, 5);
  });

  it('places instances by the matrices of the mesh and its layer group too', () => {
    const mesh = panels();
    mesh.scale.set(1, 2, 1);
    const { surfaces, layers } = sceneryOf([]);
    layers[0]?.add(mesh);
    layers[0]?.position.set(0, 0, -2);
    surfaces.setScenery(layers[0]?.parent ?? null);
    expect(surfaces.hit(new Vector3(0, 11.5, 0), UPSTAGE)?.t).toBeCloseTo(12, 5);
    expect(surfaces.hit(new Vector3(0, 12.5, 0), UPSTAGE)).toBeNull();
    expect(surfaces.hit(new Vector3(0, 10, -2), new Vector3(-1, 0, 0))?.t).toBeCloseTo(8, 5);
  });
});
