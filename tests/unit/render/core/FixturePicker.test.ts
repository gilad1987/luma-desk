/**
 * Picking maths: client to NDC, world to screen projection and raycast hits on registered objects. The pointer
 * handlers and box-select rectangle are UI code and not covered here.
 */
import { BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector2, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { Fixture } from '../../../../src/domain/Fixture';
import { projectToScreen } from '../../../../src/render/shared';
import { clientToNdc } from '../../../../src/render/picking/clientToNdc';
import { FixturePicker } from '../../../../src/render/picking/FixturePicker';

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

const screenPoint = () => ({ x: 0, y: 0, ndcX: 0, ndcY: 0, depth: 0 });

describe('projectToScreen', () => {
  it('puts a point straight ahead in the rect centre with depth below 1', () => {
    const point = projectToScreen(lookingDownMinusZ(), new Vector3(0, 0, -10), rect, screenPoint());
    expect([point.x, point.y]).toEqual([110, 70]);
    expect(point.depth).toBeLessThan(1);
  });

  it('gives a point behind the camera a depth above 1', () => {
    expect(projectToScreen(lookingDownMinusZ(), new Vector3(0, 0, 10), rect, screenPoint()).depth).toBeGreaterThan(1);
  });

  it('overwrites and returns the caller-owned point, so a frame loop can reuse one', () => {
    const out = screenPoint();
    expect(projectToScreen(lookingDownMinusZ(), new Vector3(0, 0, -5), rect, out)).toBe(out);
    expect([out.x, out.y, out.ndcX, out.ndcY]).toEqual([110, 70, 0, 0]);
  });
});

describe('FixturePicker', () => {
  it('returns the fixture of the nearest registered object under the pointer', () => {
    const picker = new FixturePicker({ getBoundingClientRect: () => rect }, lookingDownMinusZ());
    const near = new Fixture(1, 'wash', new Vector3(), 'hang', null);
    const far = new Fixture(2, 'spot', new Vector3(), 'hang', null);
    picker.register(boxAt(-20), far);
    picker.register(boxAt(-10), near);
    expect(picker.pickAt(110, 70)).toBe(near);
  });

  it('returns null when nothing registered is hit', () => {
    const picker = new FixturePicker({ getBoundingClientRect: () => rect }, lookingDownMinusZ());
    picker.register(boxAt(-10), new Fixture(1, 'wash', new Vector3(), 'hang', null));
    expect(picker.pickAt(15, 25)).toBeNull();
  });
});
