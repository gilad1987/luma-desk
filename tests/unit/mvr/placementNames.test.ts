// @vitest-environment jsdom
/**
 * Placements carry the names the LED rule reads: the name of the layer the object sits in, and the name of the
 * innermost Symdef a symbol mesh came from (absent for a mesh the object holds itself).
 */
import { describe, expect, it } from 'vitest';
import { walkScene } from '../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';
import { sceneXml } from '../../shared/index.ts';

const SYMDEFS = `
  <Symdef uuid="SD1" name="Tile Grid"><ChildList><Symbol uuid="I1" symdef="SD2"/></ChildList></Symdef>
  <Symdef uuid="SD2" name="Video Tile"><ChildList><Geometry3D fileName="tile.glb"/></ChildList></Symdef>
  <Symdef uuid="SD3" name="Outer"><ChildList><Geometry3D fileName="outer.glb"/></ChildList></Symdef>`;

const SCENE = sceneXml(
  `<Layer uuid="L1" name="Upstage Set"><ChildList>
    <SceneObject uuid="S1" name="Back wall"><Geometries><Geometry3D fileName="wall.glb"/></Geometries></SceneObject>
    <SceneObject uuid="S2" name="Grid"><Geometries>
      <Symbol uuid="I2" symdef="SD1"/><Symbol uuid="I3" symdef="SD3"/>
    </Geometries></SceneObject>
  </ChildList></Layer>`,
  SYMDEFS,
);

describe('placement names', () => {
  const scene = walkScene(parseXml(SCENE));

  it('gives every placement its layer name and the innermost Symdef name', () => {
    expect(scene.placements.map((p) => [p.file, p.layerName, p.symdef])).toEqual([
      ['wall.glb', 'Upstage Set', undefined],
      ['tile.glb', 'Upstage Set', 'Video Tile'],
      ['outer.glb', 'Upstage Set', 'Outer'],
    ]);
  });
});
