/**
 * Owns what the scenery accuracy hook reports: the world box of each drawn MVR layer group, found by its layer key,
 * with every instance of an instanced mesh placed by its own matrix and the group's own transform included.
 */
import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { mvrSceneryBoxHook } from '../../../../src/app/testHook/mvrSceneryBoxes';
import { MVR_LAYER_KEY } from '../../../../src/render/mvr/mvrLayerKey';

const material = new MeshBasicMaterial();
const round = (v: readonly number[]): number[] => v.map((x) => Math.round(x * 1e6) / 1e6);

function layerGroup(uuid: string): Group {
  const group = new Group();
  group.userData[MVR_LAYER_KEY] = uuid;
  return group;
}

describe('mvrSceneryBoxes', () => {
  const scene = new Scene();
  const stage = new Group();
  // the scenery group is moved as a whole, as a fit could move it: the boxes are in the world, so it counts
  stage.position.set(10, 0, 0);
  scene.add(stage);
  const merged = layerGroup('L-MERGED');
  const plinth = new Mesh(new BoxGeometry(2, 1, 1), material);
  plinth.position.set(0, 0.5, 0);
  merged.add(plinth);
  const instanced = layerGroup('L-INST');
  const crates = new InstancedMesh(new BoxGeometry(1, 1, 1), material, 2);
  crates.setMatrixAt(0, new Matrix4().makeTranslation(-3, 0.5, 0));
  // turned 90 degrees about Y, so its 1 x 1 x 3 box lies along X
  crates.setMatrixAt(1, new Matrix4().makeRotationY(Math.PI / 2).setPosition(4, 0.5, 0));
  crates.geometry = new BoxGeometry(1, 1, 3);
  instanced.add(crates);
  stage.add(merged, instanced, new Group());
  const boxes = mvrSceneryBoxHook({ mvrScene: scene }).mvrSceneryBoxes();

  it('reports only the groups that carry a layer key', () => {
    expect(boxes.map((b) => b.layer)).toEqual(['L-MERGED', 'L-INST']);
  });

  it('a plain mesh: its box in the world, the parent move included', () => {
    const plinthBox = boxes.find((b) => b.layer === 'L-MERGED');
    expect(round(plinthBox?.min ?? [])).toEqual([9, 0, -0.5]);
    expect(round(plinthBox?.max ?? [])).toEqual([11, 1, 0.5]);
  });

  it('an instanced mesh: every instance by its own matrix, a turned one by its turned corners', () => {
    const crateBox = boxes.find((b) => b.layer === 'L-INST');
    // instance 0 spans x 6.5..7.5 and z -1.5..1.5; instance 1 turned spans x 12.5..15.5 and z -0.5..0.5
    expect(round(crateBox?.min ?? [])).toEqual([6.5, 0, -1.5]);
    expect(round(crateBox?.max ?? [])).toEqual([15.5, 1, 1.5]);
  });

  it('an empty scene reports nothing', () => {
    expect(mvrSceneryBoxHook({ mvrScene: new Scene() }).mvrSceneryBoxes()).toEqual([]);
  });
});
