/**
 * The light of a marked wall built of tiles: the placements of one cabinet file come as instances of one mesh, or as
 * parts of one merged mesh. The tiles of one wall join into one light of the wall's full area; walls apart keep a
 * light each, and a mirrored instance is measured where it stands.
 */
import { BoxGeometry, InstancedMesh, Matrix4, Mesh, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { afterEach, describe, expect, it } from 'vitest';
import { syncWallLights, wallLights } from '../../../../../src/render/mvr/led/ledLightPool.ts';
import { lightMesh, unlightMesh } from '../../../../../src/render/mvr/led/ledMeshLight.ts';

const FRONT = new Vector3(0, 0, 1);
const lit: Mesh[] = [];
afterEach(() => lit.splice(0).forEach(unlightMesh));

/** The wall lights of `mesh`, from left to right, rounded to centimetres. */
function lightsOf(mesh: Mesh): { position: number[]; normal: number[]; width: number; height: number }[] {
  lit.push(mesh);
  lightMesh(mesh, FRONT);
  syncWallLights();
  const cm = (value: number): number => Math.round(value * 100) / 100 + 0;
  return wallLights()
    .map(({ position, normal, width, height }) => ({
      position: position.map(cm),
      normal: normal.map(cm),
      width: cm(width),
      height: cm(height),
    }))
    .sort((a, b) => (a.position[0] ?? 0) - (b.position[0] ?? 0));
}

/** The places of a 6 x 3 m wall of 72 cabinets of 0.5 m, centred on `x`, standing on the floor. */
const tilesAt = (x: number): Matrix4[] =>
  Array.from({ length: 72 }, (_, i) =>
    new Matrix4().makeTranslation(x - 2.75 + (i % 12) * 0.5, 0.25 + Math.floor(i / 12) * 0.5, 0),
  );

/** One instanced mesh of 0.5 m cabinets, shrunk by `gap`, at `places`. */
function instanced(gap: number, places: readonly Matrix4[]): InstancedMesh {
  const mesh = new InstancedMesh(new BoxGeometry(0.5 - gap, 0.5 - gap, 0.1), undefined, places.length);
  places.forEach((at, i) => mesh.setMatrixAt(i, at));
  return mesh;
}

const nearArea = (light: { width: number; height: number } | undefined, area: number): boolean =>
  Math.abs(((light?.width ?? 0) * (light?.height ?? 0)) / area - 1) < 0.05;

describe('lightMesh on a tiled wall', () => {
  it.each([0, 0.02])('gives an instanced wall of 72 tiles (gap %s m) one light of its full area', (gap) => {
    const lights = lightsOf(instanced(gap, tilesAt(0)));
    expect(lights.map(({ position }) => position)).toEqual([[0, 1.5, 0.35]]);
    expect(nearArea(lights[0], 18)).toBe(true);
  });

  it('gives a merged wall of 72 tiles with 2 cm gaps one light of its full area', () => {
    const tiles: BufferGeometry[] = tilesAt(0).map((at) => new BoxGeometry(0.48, 0.48, 0.1).applyMatrix4(at));
    const lights = lightsOf(new Mesh(mergeGeometries(tiles)));
    expect(lights.map(({ position }) => position)).toEqual([[0, 1.5, 0.35]]);
    expect(nearArea(lights[0], 18)).toBe(true);
  });

  it('gives two instanced walls 20 m apart a light each, where they stand', () => {
    const lights = lightsOf(instanced(0, [...tilesAt(-10), ...tilesAt(10)]));
    expect(lights.map(({ position, width, height }) => [position, Math.round(width), Math.round(height)])).toEqual([
      [[-10, 1.5, 0.35], 6, 3],
      [[10, 1.5, 0.35], 6, 3],
    ]);
  });

  it('measures a mirrored instance (scale.x = -1) where it stands', () => {
    const mesh = new InstancedMesh(new BoxGeometry(2, 1, 0.1).translate(0.5, 0, 0), undefined, 1);
    mesh.setMatrixAt(0, new Matrix4().makeTranslation(2, 1, 0).multiply(new Matrix4().makeScale(-1, 1, 1)));
    const lights = lightsOf(mesh);
    expect(lights.map(({ position, normal, width, height }) => [position, normal, width, height])).toEqual([
      [[1.5, 1, 0.35], [0, 0, 1], 2, 1],
    ]);
  });
});
