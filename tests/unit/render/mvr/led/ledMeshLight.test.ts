/**
 * The light of a marked mesh: one source per connected part, each measured along the wall axes of the mesh's front,
 * so walls apart light where they stand and a turned wall's light stays just in front of its face.
 */
import { BoxGeometry, Mesh, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { afterEach, describe, expect, it } from 'vitest';
import { syncWallLights, wallLights } from '../../../../../src/render/mvr/led/ledLightPool.ts';
import { lightMesh, unlightMesh } from '../../../../../src/render/mvr/led/ledMeshLight.ts';

const lit: Mesh[] = [];
afterEach(() => lit.splice(0).forEach(unlightMesh));

/** The wall lights of `mesh` lit with `front`, rounded to centimetres. */
function lightsOf(mesh: Mesh, front: Vector3): { position: number[]; width: number; height: number }[] {
  lit.push(mesh);
  lightMesh(mesh, front);
  syncWallLights();
  const cm = (value: number): number => Math.round(value * 100) / 100;
  return wallLights().map(({ position, width, height }) => ({ position: position.map(cm), width, height }));
}

describe('lightMesh', () => {
  it('gives two walls merged into one mesh a light each, where they stand', () => {
    const wall = (x: number): BoxGeometry => new BoxGeometry(6, 3, 0.1).translate(x, 3, 0);
    const lights = lightsOf(new Mesh(mergeGeometries([wall(-10), wall(10)])), new Vector3(0, 0, 1));
    const sorted = [...lights].sort((a, b) => (a.position[0] ?? 0) - (b.position[0] ?? 0));
    expect(sorted.map(({ position, width, height }) => [position, Math.round(width), Math.round(height)])).toEqual([
      [[-10, 3, 0.35], 6, 3],
      [[10, 3, 0.35], 6, 3],
    ]);
  });

  it('measures a turned wall along itself: its light is 0.3 m in front of its face', () => {
    const turned = new Mesh(new BoxGeometry(6, 3, 0.1).rotateY(Math.PI / 4).translate(0, 3, 0));
    const front = new Vector3(Math.SQRT1_2, 0, Math.SQRT1_2);
    const [light] = lightsOf(turned, front);
    const ahead = new Vector3(...(light?.position ?? [])).sub(new Vector3(0, 3, 0));
    expect(
      [ahead.dot(front), ahead.clone().projectOnPlane(front).length()].map((v) => Math.round(v * 100) / 100),
    ).toEqual([0.35, 0]);
    expect([Math.round(light?.width ?? 0), Math.round(light?.height ?? 0)]).toEqual([6, 3]);
  });
});
