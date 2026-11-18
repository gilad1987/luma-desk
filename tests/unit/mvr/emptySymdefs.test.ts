// @vitest-environment jsdom
/**
 * A Symdef with no children (a CAD tile grid or a seat block whose geometry the writer left out) gives its objects no
 * meshes. The scene walk keeps every such placement as a record with its Symdef, owner, layer and world matrix, so
 * the import can count them all; none of them is a mesh placement.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { EmptySymdefs } from '../../../src/mvr/scene/EmptySymdefs.ts';
import { walkScene } from '../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';
import { sceneXml } from '../../shared/index.ts';

const at = (x: number, y: number, z: number): string => `<Matrix>{1,0,0}{0,1,0}{0,0,1}{${x},${y},${z}}</Matrix>`;
const symbol = (symdef: string, matrix = ''): string =>
  `<Symbol uuid="i-${symdef}" symdef="${symdef}">${matrix}</Symbol>`;
const AUX =
  '<Symdef uuid="Tiles" name="Tile Grid"><ChildList/></Symdef><Symdef uuid="Seats" name="Seat Block"/>' +
  '<Symdef uuid="Desk" name="Desk"><ChildList><Geometry3D fileName="desk.glb"/></ChildList></Symdef>' +
  `<Symdef uuid="Row" name="Row"><ChildList><Geometry3D fileName="rail.glb"/>${symbol('Seats', at(0, 0, 0))}` +
  `${symbol('Seats', at(500, 0, 0))}</ChildList></Symdef>`;

const object = (name: string, matrix: string, geometries: string): string =>
  `<SceneObject uuid="o-${name}" name="${name}">${matrix}<Geometries>${geometries}</Geometries></SceneObject>`;
const walk = (objects: string): ReturnType<typeof walkScene> =>
  walkScene(parseXml(sceneXml(`<Layer uuid="L1" name="Hall"><ChildList>${objects}</ChildList></Layer>`, AUX)));
const place = (m: Float64Array): number[] => [m[12] ?? 0, m[13] ?? 0, m[14] ?? 0];

describe('empty Symdefs', () => {
  it('keeps every placement of one as a record, and its meshes list stays as it was', () => {
    const refs = symbol('Tiles', at(100, 0, 0)) + symbol('Tiles', at(600, 0, 0)) + symbol('Seats') + symbol('Desk');
    const scene = walk(object('Block A', at(0, 2000, 0), refs));
    expect(scene.placements.map((p) => p.file)).toEqual(['desk.glb']);
    expect(scene.proxies.map((p) => [p.symdef, p.symdefName, p.name, p.layer, p.layerName])).toEqual([
      ['Tiles', 'Tile Grid', 'Block A', 'L1', 'Hall'],
      ['Tiles', 'Tile Grid', 'Block A', 'L1', 'Hall'],
      ['Seats', 'Seat Block', 'Block A', 'L1', 'Hall'],
    ]);
    expect(scene.proxies.map((p) => place(p.matrix))).toEqual([
      [100, 2000, 0],
      [600, 2000, 0],
      [0, 2000, 0],
    ]);
    expect(scene.warnings).toEqual([]);
  });

  it('keeps the ones a Symdef with geometry places, once per placement of that Symdef', () => {
    const scene = walk(
      object('Stand', at(0, 1000, 0), symbol('Row', at(0, 0, 0)) + symbol('Row', at(0, 900, 300))) +
        object('Other', '', symbol('Tiles')),
    );
    expect(scene.placements.map((p) => p.file)).toEqual(['rail.glb', 'rail.glb']);
    expect(scene.proxies.map((p) => [p.name, p.symdef, ...place(p.matrix)])).toEqual([
      ['Stand', 'Seats', 0, 1000, 0],
      ['Stand', 'Seats', 500, 1000, 0],
      ['Stand', 'Seats', 0, 1900, 300],
      ['Stand', 'Seats', 500, 1900, 300],
      ['Other', 'Tiles', 0, 0, 0],
    ]);
  });

  describe('the cap', () => {
    const max = EmptySymdefs.MAX;
    afterEach(() => Object.defineProperty(EmptySymdefs, 'MAX', { value: max }));

    it('counts each placement emitted into the scene once, not again while it builds a shared Symdef', () => {
      Object.defineProperty(EmptySymdefs, 'MAX', { value: 4 });
      const scene = walk(object('Stand', '', symbol('Row', at(0, 0, 0)) + symbol('Row', at(0, 900, 0))));
      expect([scene.proxies.length, scene.warnings]).toEqual([4, []]);
    });

    it('leaves out the placements past the cap with one warning', () => {
      Object.defineProperty(EmptySymdefs, 'MAX', { value: 3 });
      const scene = walk(object('Stand', '', symbol('Row', at(0, 0, 0)) + symbol('Row', at(0, 900, 0))));
      expect([scene.proxies.length, scene.warnings.map((w) => w.code)]).toEqual([3, ['empty-symdef']]);
    });
  });

  it('keeps nothing when every symbol has geometry', () => {
    expect(walk(object('Desks', '', symbol('Desk') + symbol('Desk'))).proxies).toEqual([]);
  });
});
