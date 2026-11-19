// @vitest-environment jsdom
/** Review #1: an entry stored without the UTF-8 flag keeps the name the scene uses for it through a re-export. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { readOriginal } from '../../../../src/mvr/export/passThrough/readOriginal.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { fx, make3ds, makeRawNameZip, passUuid as u } from '../../../shared/index.ts';

const MESH_NAME = 'trüss.3ds';
const sceneOf = (meshName: string): string =>
  '<?xml version="1.0" encoding="UTF-8"?>\n<GeneralSceneDescription verMajor="1" verMinor="6"><Scene><AUXData/>' +
  '<Layers><Layer uuid="B0000000-0000-4000-8000-000000000001" name="L"><ChildList>' +
  fx(u(1), 1, { addresses: '<Address break="0">1</Address>' }) +
  '<SceneObject uuid="D1000000-0000-4000-8000-000000000001" name="Truss">' +
  '<Matrix>{1,0,0}{0,1,0}{0,0,1}{0,0,0}</Matrix>' +
  `<Geometries><Geometry3D fileName="${meshName}"/></Geometries></SceneObject>` +
  '</ChildList></Layer></Layers></Scene></GeneralSceneDescription>\n';
const SCENE = sceneOf(MESH_NAME);

const cases: readonly (readonly [string, Uint8Array, string])[] = [
  // byte 0x81 is not UTF-8, so the import reads it as code page 437, where it is the letter the scene names
  ['code page 437', new Uint8Array([0x74, 0x72, 0x81, 0x73, 0x73, 0x2e, 0x33, 0x64, 0x73]), MESH_NAME],
  ['UTF-8 without the flag', new TextEncoder().encode(MESH_NAME), MESH_NAME],
  // byte 0xE9 is code page 437 first (a theta) and Windows-1252 second; the scene names the second reading
  ['Windows-1252', new Uint8Array([0x74, 0x72, 0xe9, 0x73, 0x73, 0x2e, 0x33, 0x64, 0x73]), 'tréss.3ds'],
];

describe('pass-through export of a legacy entry name (review #1)', () => {
  for (const [label, rawName, meshName] of cases) {
    it(`writes the ${label} mesh name as the scene names it, so the re-import finds the mesh`, async () => {
      const mesh = make3ds([
        [0, 0, 0],
        [1000, 0, 0],
        [0, 1000, 0],
      ]);
      const original = makeRawNameZip([
        ['GeneralSceneDescription.xml', sceneOf(meshName)],
        [rawName, mesh],
        ['Test@Spot.gdtf', 'not a real gdtf'],
      ]);
      const first = await importMvr(original, { name: 'a.mvr' });
      expect(first.meshes.has(meshName)).toBe(true);
      const { bytes } = exportMvr(first.design, { original });
      expect(Object.keys(unzipSync(bytes))).toContain(meshName);
      const second = await importMvr(bytes, { name: 'b.mvr' });
      expect(second.meshes.has(meshName)).toBe(true);
      expect(second.warnings.map((warning) => warning.code)).not.toContain('missing-mesh');
    });
  }

  it('reports two raw names that decode to one name as a duplicate and copies the first', () => {
    const [cp437, utf8] = cases.map(([, rawName]) => rawName);
    if (!cp437 || !utf8) throw new Error('no case');
    const original = makeRawNameZip([
      ['GeneralSceneDescription.xml', SCENE],
      [cp437, 'first'],
      [utf8, 'second'],
    ]);
    const archive = readOriginal(original);
    expect(archive.duplicates).toEqual([MESH_NAME]);
    const meshes = archive.entries.filter((entry) => entry.name === MESH_NAME);
    expect(meshes.map((entry) => strFromU8(entry.bytes))).toEqual(['first']);
  });
});
