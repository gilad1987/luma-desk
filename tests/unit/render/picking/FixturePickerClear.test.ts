import { BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { Fixture } from '../../../../src/domain/Fixture';
import { FixturePicker } from '../../../../src/render/picking/FixturePicker';

const rect = { left: 0, top: 0, width: 200, height: 100 };

describe('FixturePicker.clear', () => {
  it('forgets the old rig, so only objects registered after it are picked', () => {
    const camera = new PerspectiveCamera(46, 2, 0.1, 1600);
    camera.updateMatrixWorld();
    const picker = new FixturePicker({ getBoundingClientRect: () => rect }, camera);
    const box = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
    box.position.set(0, 0, -5);
    box.updateMatrixWorld();
    const oldFixture = new Fixture({ id: 1, type: 'beam', pos: box.position, mount: 'hang', fixed: null });
    const newFixture = new Fixture({ id: 2, type: 'beam', pos: box.position, mount: 'hang', fixed: null });
    picker.register(box, oldFixture);
    expect(picker.pickAt(100, 50)).toBe(oldFixture);
    picker.clear();
    expect(picker.pickAt(100, 50)).toBeNull();
    picker.register(box, newFixture);
    expect(picker.pickAt(100, 50)).toBe(newFixture);
  });
});
