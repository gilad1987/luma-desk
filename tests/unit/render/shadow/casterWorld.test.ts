import { BoxGeometry, InstancedMesh, Matrix4, Mesh, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { CasterScene } from '../../../../src/render/shadow/CasterScene';
import { mergedBoxes, rootWith } from './casterShapes';

/** The world boxes of the chunks of a mesh, in mm and in a fixed order. */
function chunkBoxes(mesh: Mesh): number[][] {
  const { boxes } = new CasterScene(rootWith(mesh).root).parts;
  const rows = Array.from({ length: boxes.length / 6 }, (_, i) =>
    boxes.slice(i * 6, i * 6 + 6).map((value) => Math.round(value * 1000) / 1000 + 0),
  );
  return rows.sort((a, b) => a.join().localeCompare(b.join()));
}

const moved = <T extends Object3D>(node: T, change: (node: T) => void): T => {
  change(node);
  return node;
};

describe('the caster grid is laid in the world', () => {
  it('gives a mesh in millimetres with scale 0.001 the cells of the same mesh in metres', () => {
    const metres = chunkBoxes(new Mesh(mergedBoxes()));
    const millimetres = new Mesh(mergedBoxes().scale(1000, 1000, 1000));
    expect(metres.length).toBeGreaterThan(1);
    expect(chunkBoxes(moved(millimetres, (mesh) => mesh.scale.setScalar(0.001)))).toEqual(metres);
  });

  it('gives a turned and moved mesh the cells of the mesh with that move in its vertices', () => {
    const turned = moved(new Mesh(mergedBoxes()), (mesh) => {
      mesh.rotation.y = Math.PI / 6;
      mesh.position.set(1.3, 0.2, 2.7);
      mesh.updateMatrix();
    });
    const baked = new Mesh(mergedBoxes().applyMatrix4(turned.matrix));
    expect(chunkBoxes(turned)).toEqual(chunkBoxes(baked));
  });

  it('bins the placements of a scaled instanced mesh by world cell, and boxes a mirrored placement', () => {
    // a 1 x 2 x 3 m box in centimetres with its corner at the origin, 5 m up
    const mesh = new InstancedMesh(new BoxGeometry(100, 200, 300).translate(50, 100, 150), undefined, 3);
    mesh.scale.setScalar(0.01);
    mesh.position.set(0, 5, 0);
    mesh.setMatrixAt(0, new Matrix4().makeTranslation(100, 0, 0));
    mesh.setMatrixAt(1, new Matrix4().makeTranslation(250, 0, 0));
    mesh.setMatrixAt(2, new Matrix4().makeScale(-1, 1, 1).setPosition(4000, 0, 0));
    const casters = new CasterScene(rootWith(mesh).root);
    // 1 m and 2.5 m along x are one 4 m cell in the world, and were two cells of 4 cm
    expect(casters.parts.instanced.map((chunk) => chunk.count).sort()).toEqual([1, 2]);
    expect(chunkBoxes(mesh)).toEqual([
      [1, 5, 0, 3.5, 7, 3],
      [39, 5, 0, 40, 7, 3],
    ]);
  });
});
