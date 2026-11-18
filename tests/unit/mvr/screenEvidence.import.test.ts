// @vitest-environment jsdom
/**
 * The two facts the import adds to each placement for the LED rule (`withScreenEvidence`): `display` from a GDTF
 * `<Display>` geometry of the object's own GDTF, and `panel` from the mesh bounds where the object stands. All names
 * and products are invented.
 */
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../src/mvr/index.ts';
import { make3ds, makeGdtf, makeMvr, sceneXml } from '../../shared/index.ts';

/** A box mesh in millimetres, as its eight corners. */
const box = (x: number, y: number, z: number): [number, number, number][] =>
  [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i & 1 ? x : 0, i & 2 ? y : 0, i & 4 ? z : 0]);

/** One `<SceneObject>` with one mesh and, when given, its own GDTF. */
function sceneObject(uuid: string, name: string, file: string, spec = ''): string {
  const gdtf = spec === '' ? '' : `<GDTFSpec>${spec}</GDTFSpec><GDTFMode>Std</GDTFMode>`;
  const geometries = `<Geometries><Geometry3D fileName="${file}"/></Geometries>`;
  const matrix = '<Matrix>{1,0,0}{0,1,0}{0,0,1}{0,0,0}</Matrix>';
  return `<SceneObject uuid="${uuid}" name="${name}">${matrix}${gdtf}${geometries}</SceneObject>`;
}

const SCENE = sceneXml(
  `<Layer uuid="L1" name="Set"><ChildList>
    ${sceneObject('S1', 'Object 3', 'cube.3ds', 'Acme@Face')}
    ${sceneObject('S2', 'Upstage LED Tile Row', 'flat.3ds')}
    ${sceneObject('S3', 'Upstage LED Riser', 'cube.3ds')}
  </ChildList></Layer>`,
);
const FILES = {
  'Acme@Face.gdtf': makeGdtf({
    geometries: '<Geometry Name="Body"><Display Name="Face" Texture="face.png"/></Geometry>',
  }),
  'cube.3ds': make3ds(box(1000, 1000, 1000)),
  'flat.3ds': make3ds(box(4000, 100, 2500)),
};

describe('the screen evidence of an import', () => {
  it('marks an object whose GDTF holds a Display, and a thin standing mesh', async () => {
    const { geometry } = await importMvr(makeMvr(SCENE, FILES), { name: 'Evidence.mvr' });
    const facts = geometry.placements.map(({ name, display, panel }) => ({ name, display, panel }));
    expect(facts).toEqual([
      { name: 'Object 3', display: true, panel: false },
      { name: 'Upstage LED Tile Row', display: false, panel: true },
      { name: 'Upstage LED Riser', display: false, panel: false },
    ]);
  });
});
