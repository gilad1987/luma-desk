// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../src/mvr/index.ts';
import { makeGlb, makeMvr, sceneXml } from '../../shared/index.ts';

const GLB = makeGlb({
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  accessors: [{ min: [0, 0, 0], max: [1, 1, 1] }],
});
const object = (uuid: string, file: string): string =>
  `<SceneObject uuid="${uuid}"><Geometries><Geometry3D fileName="${file}"/></Geometries></SceneObject>`;
const fixture = (uuid: string, id: number): string =>
  `<Fixture uuid="${uuid}" name="${uuid}"><GDTFSpec></GDTFSpec><GDTFMode></GDTFMode><FixtureID>${id}</FixtureID></Fixture>`;
const layer = (content: string): string =>
  sceneXml(`<Layer uuid="L1" name="Set"><ChildList>${content}</ChildList></Layer>`);
const linesOf = async (mvr: Uint8Array, code: string) =>
  (await importMvr(mvr, { name: 'Show.mvr' })).warnings.filter((warning) => warning.code === code);

describe('repeated warnings of one cause', () => {
  it('keeps every missing mesh file reachable on the folded line', async () => {
    const files = ['a.glb', 'b.glb', 'c.glb', 'd.glb', 'e.glb'];
    const scene = layer(files.map((file, index) => object(`S${index}`, file)).join(''));
    const [line, ...rest] = await linesOf(makeMvr(scene), 'missing-mesh');
    expect(rest).toEqual([]);
    expect(line?.refs).toEqual(files);
  });

  it('folds mesh names that match several files', async () => {
    const scene = layer(object('S1', 'deck.glb') + object('S2', 'wall.glb'));
    const files = { 'Deck.glb': GLB, 'DECK.glb': GLB, 'Wall.glb': GLB, 'WALL.glb': GLB };
    const lines = await linesOf(makeMvr(scene, files), 'ambiguous-file');
    expect(lines.map((line) => line.message)).toEqual([
      '2 mesh file names match several files in the archive, so none is used: "deck.glb", "wall.glb".',
    ]);
  });

  it('folds fixtures that share a fixture id into one line with the count', async () => {
    const scene = layer([fixture('F1', 7), fixture('F2', 7), fixture('F3', 7), fixture('F4', 8)].join(''));
    const lines = await linesOf(makeMvr(scene), 'duplicate-id');
    expect(lines.map((line) => line.message)).toEqual([
      '2 fixtures have a fixture id that another fixture has too; the desk gave them new ids.',
    ]);
    expect(lines[0]?.refs).toEqual(['F2', 'F3']);
  });

  it('warns once when the file is newer than MVR 1.6, and not for 1.6 or older', async () => {
    const scene = layer(object('S1', 'here.glb'));
    const newer = scene.replace('verMinor="6"', 'verMinor="7"');
    const lines = await linesOf(makeMvr(newer, { 'here.glb': GLB }), 'newer-version');
    expect(lines.map((line) => line.message)).toEqual([
      'The file is MVR 1.7, newer than the 1.6 the desk reads; parts that 1.6 does not have are not imported.',
    ]);
    expect(await linesOf(makeMvr(scene, { 'here.glb': GLB }), 'newer-version')).toEqual([]);
    expect(
      await linesOf(makeMvr(scene.replace('verMinor="6"', 'verMinor="4"'), { 'here.glb': GLB }), 'newer-version'),
    ).toEqual([]);
  });
});
