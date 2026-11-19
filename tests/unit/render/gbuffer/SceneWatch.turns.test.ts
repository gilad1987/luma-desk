/** The scene-moved stamp sees every turn: about each axis, either way, and in steps of a few hundredths of a degree. */
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type EulerOrder } from 'three';
import { describe, expect, it } from 'vitest';
import { SceneWatch } from '../../../../src/render/gbuffer/SceneWatch';

const DEG = Math.PI / 180;
const parent = new Group();
const mesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
parent.add(mesh);
const watch = new SceneWatch();
watch.add(mesh, true);

/** The stamp of the mesh at (1, 2, 3) turned by `x`, `y` and `z` degrees in `order`. */
function stampAt(x: number, y: number, z: number, order: EulerOrder = 'XYZ'): number {
  mesh.position.set(1, 2, 3);
  mesh.rotation.set(x * DEG, y * DEG, z * DEG, order);
  parent.updateMatrixWorld(true);
  return watch.stamp();
}

describe('the scene-moved stamp of a turn', () => {
  it('tells a turn of +30 from one of -30 degrees about X, Y and Z, also for a tilt after a pan', () => {
    expect(stampAt(30, 0, 0)).not.toBe(stampAt(-30, 0, 0));
    expect(stampAt(0, 30, 0)).not.toBe(stampAt(0, -30, 0));
    expect(stampAt(0, 0, 30)).not.toBe(stampAt(0, 0, -30));
    expect(stampAt(30, 40, 0, 'YXZ')).not.toBe(stampAt(-30, 40, 0, 'YXZ'));
  });

  it('changes for every step of 0.03 degrees of a tilt, a pan or a roll, from level to upright', () => {
    for (const axis of [0, 1, 2]) {
      const on = (index: number, angle: number): number => (index === axis ? angle : 0);
      const turned = (angle: number): number => stampAt(on(0, angle), on(1, angle), on(2, angle));
      for (let angle = 0; angle < 90; angle += 0.03) {
        expect(turned(angle + 0.03), `axis ${String(axis)} at ${angle.toFixed(2)}`).not.toBe(turned(angle));
      }
    }
  });

  it('changes for a step of 0.03 degrees of a tilt after a pan of 40', () => {
    for (let tilt = -60; tilt < 60; tilt += 0.03) {
      expect(stampAt(tilt + 0.03, 40, 0, 'YXZ'), `tilt ${tilt.toFixed(2)}`).not.toBe(stampAt(tilt, 40, 0, 'YXZ'));
    }
  });

  it('is one value for a mesh that has not moved', () => {
    expect(stampAt(2, 40, 0, 'YXZ')).toBe(stampAt(2, 40, 0, 'YXZ'));
  });
});
