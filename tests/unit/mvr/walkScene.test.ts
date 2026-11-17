// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MvrError } from '../../../src/mvr/MvrWarning.ts';
import { walkScene } from '../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';
import { sceneXml } from '../../shared/index.ts';

const geo = (uuid: string, tag: string, file: string): string =>
  `<${tag} uuid="${uuid}"><Geometries><Geometry3D fileName="${file}"/></Geometries></${tag}>`;

const SCENE = sceneXml(`
  <Layer uuid="L1" name="במה ראשית"><ChildList>
    <Fixture uuid="F1" name="Spot 1"><FixtureID>6001</FixtureID></Fixture>
    ${geo('S1', 'SceneObject', 'deck.glb')}
    <Truss uuid="T1"><Geometries><Geometry3D fileName="truss"/><Geometry3D fileName="clamp.glb"/></Geometries></Truss>
    ${geo('SP1', 'Speaker', 'speaker.glb')}
    <Mystery uuid="M1"><ChildList><Fixture uuid="F2"/>${geo('V1', 'VideoScreen', 'led.glb')}</ChildList></Mystery>
    ${geo('G1', 'Gizmo', 'gizmo.glb')}
  </ChildList></Layer>
  <Layer uuid="L2" name="Notes "><ChildList>
    <GroupObject uuid="GR"><ChildList>
      ${geo('P1', 'Projector', 'proj.glb')}${geo('SU1', 'Support', 'hoist.glb')}
      ${geo('B1', 'SpeakerBumper', 'bumper.glb')}
    </ChildList></GroupObject>
    <FocusPoint uuid="FP1"><Geometries><Geometry3D fileName="marker.glb"/></Geometries></FocusPoint>
  </ChildList></Layer>`);

describe('walkScene', () => {
  const scene = walkScene(parseXml(SCENE));

  it('lists layers in file order with Hebrew names and trailing spaces intact', () => {
    expect(scene.layers).toEqual([
      { uuid: 'L1', name: 'במה ראשית' },
      { uuid: 'L2', name: 'Notes ' },
    ]);
  });

  it('gives placements per kind, in file order, with the owner uuid and layer', () => {
    expect(scene.placements.map((p) => [p.kind, p.uuid, p.layer, p.file])).toEqual([
      ['SceneObject', 'S1', 'L1', 'deck.glb'],
      ['Truss', 'T1', 'L1', 'truss'],
      ['Truss', 'T1', 'L1', 'clamp.glb'],
      ['Speaker', 'SP1', 'L1', 'speaker.glb'],
      ['VideoScreen', 'V1', 'L1', 'led.glb'],
      ['Gizmo', 'G1', 'L1', 'gizmo.glb'],
      ['Projector', 'P1', 'L2', 'proj.glb'],
      ['Support', 'SU1', 'L2', 'hoist.glb'],
      ['SpeakerBumper', 'B1', 'L2', 'bumper.glb'],
    ]);
  });

  it('reads fixtures inside unknown tags, and a Speaker is an object, not a fixture', () => {
    expect(scene.fixtures.map((f) => [f.uuid, f.layer])).toEqual([
      ['F1', 'L1'],
      ['F2', 'L1'],
    ]);
  });

  it('records focus points and draws no FocusPoint geometry', () => {
    expect([...scene.focusPoints.keys()]).toEqual(['FP1']);
    expect(scene.placements.some((p) => p.kind === 'FocusPoint')).toBe(false);
    expect(scene.warnings).toEqual([]);
  });
});

describe('walkScene without content', () => {
  it('gives an empty scene for empty layers', () => {
    const empty = walkScene(parseXml(sceneXml('')));
    expect([empty.layers, empty.fixtures, empty.placements, empty.focusPoints.size]).toEqual([[], [], [], 0]);
  });

  it('throws MvrError no-scene when there is no Scene', () => {
    const doc = parseXml('<GeneralSceneDescription verMajor="1" verMinor="6"/>');
    expect(() => walkScene(doc)).toThrow(MvrError);
    expect(() => walkScene(doc)).toThrow(expect.objectContaining({ code: 'no-scene' }));
  });
});
