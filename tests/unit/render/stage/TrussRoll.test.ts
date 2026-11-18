/** A turned truss is its unturned self moved by the whole transform, so a roll about its own axis turns the chords. */
import { Matrix4, Mesh, MeshBasicMaterial, Quaternion, Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { StageTruss } from '../../../../src/domain/stage/trussTypes';
import type { Quat } from '../../../../src/domain/stage/types';
import { buildTrusses } from '../../../../src/render/stage/TrussBuilder';
import { TrussKit } from '../../../../src/render/stage/TrussKit';

const POSITION = new Vector3(1, 2, 3);

/** The world matrix of every mesh of one truss, in build order. */
function meshMatrices(truss: StageTruss): Matrix4[] {
  const scene = new Scene();
  const kit = new TrussKit(new MeshBasicMaterial());
  buildTrusses({ parent: scene, kit, dark: new MeshBasicMaterial() }, [truss], 25.5);
  scene.updateMatrixWorld(true);
  const matrices: Matrix4[] = [];
  scene.traverse((o) => {
    if (o instanceof Mesh) matrices.push(o.matrixWorld);
  });
  return matrices;
}

/** Builds the truss turned by `rotation` at `POSITION`, and expects the unturned truss at the origin moved by both. */
function expectFollowsTransform(truss: StageTruss, rotation: Quat): void {
  const plain = meshMatrices({ ...truss, transform: { position: [0, 0, 0] } });
  const turned = meshMatrices({ ...truss, transform: { position: POSITION.toArray(), rotation } });
  const move = new Matrix4().compose(POSITION, new Quaternion(...rotation), new Vector3(1, 1, 1));
  expect(turned).toHaveLength(plain.length);
  plain.forEach((m, i) => {
    const expected = move.clone().multiply(m).elements;
    turned[i]?.elements.forEach((e, k) => expect(e).toBeCloseTo(expected[k] ?? NaN, 9));
  });
}

describe('a turned truss', () => {
  it('rolls the chords of a straight truss turned about its own axis', () => {
    const straight: StageTruss = {
      id: 's',
      name: 'Straight',
      role: 'mid',
      transform: { position: [0, 0, 0] },
      params: { kind: 'straight', a: [-3, 0, 0], b: [3, 0, 0], section: 0.4 },
    };
    expectFollowsTransform(straight, [Math.sin(0.3), 0, 0, Math.cos(0.3)]);
  });

  it('turns the posts and the beam of a goalpost turned about its posts', () => {
    const goalpost: StageTruss = {
      id: 'g',
      name: 'Goalpost',
      role: 'front',
      transform: { position: [0, 0, 0] },
      params: { kind: 'goalpost', width: 8, height: 5, section: 0.3 },
    };
    expectFollowsTransform(goalpost, [0, Math.sin(0.25), 0, Math.cos(0.25)]);
  });

  it('turns a tower about its own axis with its parts', () => {
    const tower: StageTruss = {
      id: 't',
      name: 'Tower',
      role: 'side',
      transform: { position: [0, 0, 0] },
      params: {
        kind: 'tower',
        a: [0, 0, 0],
        b: [0, 6, 0],
        section: 0.3,
        parts: [{ size: [1, 0.1, 1], at: [0, 0.05, 0], material: 'dark' }],
      },
    };
    expectFollowsTransform(tower, [0, Math.sin(0.4), 0, Math.cos(0.4)]);
  });
});
