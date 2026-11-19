// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../src/mvr/index.ts';
import { gdtfMode, makeGdtf, makeGlb, makeMvr, makeRawNameZip, sceneXml } from '../../shared/index.ts';

const GLB = makeGlb({
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  accessors: [{ min: [0, 0, 0], max: [1, 1, 1] }],
});
const BEAM = '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>';
const GDTF = makeGdtf({ name: 'Par', geometries: BEAM, modes: gdtfMode('Std', [['Dimmer', 'Offset="1"']]) });

const object = (uuid: string, file: string): string =>
  `<SceneObject uuid="${uuid}"><Geometries><Geometry3D fileName="${file}"/></Geometries></SceneObject>`;
const layer = (content: string): string =>
  sceneXml(`<Layer uuid="L1" name="Set"><ChildList>${content}</ChildList></Layer>`);
const codesOf = async (mvr: Uint8Array): Promise<string[]> =>
  (await importMvr(mvr, { name: 'Show.mvr' })).warnings.map((warning) => warning.code);

describe('mesh and GDTF files with names the ZIP stores differently', () => {
  it('finds a mesh and a GDTF whose UTF-8 names do not set the UTF-8 flag', async () => {
    const fixture =
      '<Fixture uuid="F1" name="F1"><GDTFSpec>Acme@Bu\u0308hne Par</GDTFSpec><GDTFMode>Std</GDTFMode>' +
      '<Addresses><Address break="0">1</Address></Addresses></Fixture>';
    const scene = layer(object('S1', 'B\u00fchne.glb') + fixture);
    const mvr = makeRawNameZip([
      ['GeneralSceneDescription.xml', scene],
      ['Bu\u0308hne.glb', GLB],
      ['Acme@B\u00fchne Par.gdtf', GDTF],
    ]);
    const { summary, warnings, geometry } = await importMvr(mvr, { name: 'Show.mvr' });
    expect(warnings).toEqual([]);
    expect(summary.missingGdtfCount).toBe(0);
    expect(geometry.placements.map((placement) => placement.file)).toEqual(['B\u00fchne.glb']);
  });

  it('finds a GDTF whose name is stored in Latin-1 bytes, as it was found before names were decoded', async () => {
    const fixture =
      '<Fixture uuid="F1" name="F1"><GDTFSpec>Acme@B\u00fchne Par</GDTFSpec><GDTFMode>Std</GDTFMode></Fixture>';
    const latin1 = Uint8Array.from('Acme@B\u00fchne Par.gdtf', (char) => char.charCodeAt(0));
    const mvr = makeRawNameZip([
      ['GeneralSceneDescription.xml', layer(fixture)],
      [latin1, GDTF],
    ]);
    const { summary, warnings } = await importMvr(mvr, { name: 'Show.mvr' });
    expect(summary.missingGdtfCount).toBe(0);
    expect(warnings.map((warning) => warning.code)).not.toContain('missing-gdtf');
  });

  it('warns and draws nothing when a mesh name matches two files loosely', async () => {
    const mvr = makeMvr(layer(object('S1', 'deck.glb')), { 'Deck.glb': GLB, 'DECK.glb': GLB });
    const { warnings } = await importMvr(mvr, { name: 'Show.mvr' });
    const tie = warnings.find((warning) => warning.code === 'ambiguous-file');
    expect(tie?.message).toBe(
      'The mesh file deck.glb matches 2 files in the archive ("Deck.glb", "DECK.glb"); none is used.',
    );
    expect(warnings.map((warning) => warning.code)).not.toContain('missing-mesh');
  });

  it('gives one line with a count and three names for many missing mesh files', async () => {
    const files = ['a.glb', 'b.glb', 'c.glb', 'd.glb', 'e.glb'];
    const scene = layer(object('S0', 'here.glb') + files.map((file, index) => object(`S${index + 1}`, file)).join(''));
    const { warnings } = await importMvr(makeMvr(scene, { 'here.glb': GLB }), { name: 'Show.mvr' });
    const missing = warnings.filter((warning) => warning.code === 'missing-mesh');
    expect(missing.map((warning) => warning.message)).toEqual([
      '5 mesh files are not in the archive: for example "a.glb", "b.glb", "c.glb".',
    ]);
  });

  it('keeps the plain line for one missing mesh file', async () => {
    expect(await codesOf(makeMvr(layer(object('S1', 'gone.glb'))))).toContain('missing-mesh');
    const { warnings } = await importMvr(makeMvr(layer(object('S1', 'gone.glb'))), { name: 'Show.mvr' });
    expect(warnings.find((warning) => warning.code === 'missing-mesh')?.ref).toBe('gone.glb');
  });
});
