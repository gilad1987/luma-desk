import { describe, expect, it } from 'vitest';
import { BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector2, Vector3 } from 'three';
import { Fixture } from '../../../../src/domain/Fixture';
import { projectToScreen } from '../../../../src/render/CameraViewsProjection';
import { clientToNdc, FixturePicker } from '../../../../src/render/FixturePicker';
import { fakeStageCanvas } from './fakeElements';

const rect = { left: 10, top: 20, width: 200, height: 100 };

function lookingDownMinusZ(): PerspectiveCamera {
  const camera = new PerspectiveCamera(46, 2, 0.1, 1600);
  camera.updateMatrixWorld();
  return camera;
}

function boxAt(z: number): Mesh {
  const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  mesh.position.set(0, 0, z);
  mesh.updateMatrixWorld();
  return mesh;
}

describe('clientToNdc', () => {
  it('maps the rect corners and centre to -1..1 with y up', () => {
    const out = new Vector2();
    expect(clientToNdc(10, 20, rect, out).toArray()).toEqual([-1, 1]);
    expect(clientToNdc(110, 70, rect, out).toArray()).toEqual([0, 0]);
    expect(clientToNdc(210, 120, rect, out).toArray()).toEqual([1, -1]);
  });
});

describe('projectToScreen', () => {
  it('puts a point straight ahead in the rect centre with depth below 1', () => {
    const point = projectToScreen(lookingDownMinusZ(), new Vector3(0, 0, -10), rect);
    expect([point.x, point.y]).toEqual([110, 70]);
    expect(point.depth).toBeLessThan(1);
  });

  it('gives a point behind the camera a depth above 1', () => {
    expect(projectToScreen(lookingDownMinusZ(), new Vector3(0, 0, 10), rect).depth).toBeGreaterThan(1);
  });
});

describe('FixturePicker', () => {
  it('returns the fixture of the nearest registered object under the pointer', () => {
    const picker = new FixturePicker(fakeStageCanvas(rect), lookingDownMinusZ());
    const near = new Fixture(1, 'wash', new Vector3(), 'hang', null);
    const far = new Fixture(2, 'spot', new Vector3(), 'hang', null);
    picker.register(boxAt(-20), far);
    picker.register(boxAt(-10), near);
    expect(picker.pickAt(110, 70)).toBe(near);
  });

  it('returns null when nothing registered is hit', () => {
    const picker = new FixturePicker(fakeStageCanvas(rect), lookingDownMinusZ());
    picker.register(boxAt(-10), new Fixture(1, 'wash', new Vector3(), 'hang', null));
    expect(picker.pickAt(15, 25)).toBeNull();
  });

  it('projects with its own camera', () => {
    const picker = new FixturePicker(fakeStageCanvas(rect), lookingDownMinusZ());
    const point = picker.projectToScreen(new Vector3(0, 0, -5), rect);
    expect([point.x, point.y]).toEqual([110, 70]);
  });
});
