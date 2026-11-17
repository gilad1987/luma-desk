// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { transformPoint, type Mat4 } from '../../../src/mvr/math/Mat4.ts';
import { walkScene } from '../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';
import { sceneXml } from '../../shared/index.ts';

const move = (x: number, y: number, z: number): string => `<Matrix>{1,0,0}{0,1,0}{0,0,1}{${x},${y},${z}}</Matrix>`;
/** A 90 degree turn about Z (x to y), then a move by 1000 mm along x. */
const TURN = '<Matrix>{0,1,0}{-1,0,0}{0,0,1}{1000,0,0}</Matrix>';
const origin = (m: Mat4 | undefined): number[] => (m ? transformPoint(m, [0, 0, 0]) : []);

const SCENE = sceneXml(
  `<Layer uuid="L1" name="Rig">${move(0, 0, 1000)}<ChildList>
    <GroupObject uuid="G1">${TURN}<ChildList>
      <GroupObject uuid="G2">${move(100, 0, 0)}<ChildList>
        <Fixture uuid="F1">${move(10, 0, 0)}</Fixture>
        <FocusPoint uuid="FP1">${move(0, 0, -1000)}</FocusPoint>
        <SceneObject uuid="S1">${move(10, 0, 0)}<Geometries>
          <Geometry3D fileName="box.glb">${move(0, 0, 5)}</Geometry3D>
          <Symbol uuid="I1" symdef="SD">${move(1, 0, 0)}</Symbol>
        </Geometries></SceneObject>
      </ChildList></GroupObject>
    </ChildList></GroupObject>
  </ChildList></Layer>`,
  `<Symdef uuid="SD"><ChildList><Geometry3D fileName="bolt.glb">${move(0, 2, 0)}</Geometry3D></ChildList></Symdef>`,
);

describe('walkScene matrices', () => {
  const scene = walkScene(parseXml(SCENE));

  it('composes layer, nested groups and the fixture, parent first', () => {
    expect(origin(scene.fixtures[0]?.matrix)).toEqual([1000, 110, 1000]);
  });

  it('keeps the rotation of the parent group in the fixture matrix', () => {
    const fixture = scene.fixtures[0]?.matrix;
    expect(fixture && transformPoint(fixture, [1, 0, 0])).toEqual([1000, 111, 1000]);
  });

  it('gives focus points their world matrix', () => {
    expect(origin(scene.focusPoints.get('FP1'))).toEqual([1000, 100, 0]);
  });

  it('applies the Geometry3D and Symbol matrices after the owner world matrix', () => {
    expect(scene.placements.map((p) => [p.file, p.kind, p.uuid, origin(p.matrix)])).toEqual([
      ['box.glb', 'SceneObject', 'S1', [1000, 110, 1005]],
      ['bolt.glb', 'SceneObject', 'S1', [998, 111, 1000]],
    ]);
  });
});
