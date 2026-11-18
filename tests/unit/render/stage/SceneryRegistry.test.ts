import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { SceneryRegistry } from '../../../../src/render/stage/SceneryRegistry';

describe('SceneryRegistry', () => {
  it('shows every part until told otherwise and creates no three.js object', () => {
    const registry = new SceneryRegistry();
    expect(registry.isVisible('crowd')).toBe(true);
    expect(Object.values(registry)).toEqual([]);
  });

  it('hides and shows only the objects of the part it is told', () => {
    const registry = new SceneryRegistry();
    const [crowdA, crowdB, band] = [new Object3D(), new Object3D(), new Object3D()];
    registry.register('crowd', crowdA, crowdB);
    registry.register('band', band);
    registry.setVisible('crowd', false);
    expect([crowdA.visible, crowdB.visible, band.visible]).toEqual([false, false, true]);
    expect(registry.isVisible('crowd')).toBe(false);
    registry.setVisible('crowd', true);
    expect([crowdA.visible, crowdB.visible, registry.isVisible('crowd')]).toEqual([true, true, true]);
  });

  it('leaves the objects alone when a shown part is shown again', () => {
    const registry = new SceneryRegistry();
    const helper = new Object3D();
    helper.visible = false;
    registry.register('band', helper);
    registry.setVisible('band', true);
    expect(helper.visible).toBe(false);
  });

  it('hides an object registered to a part that is already hidden', () => {
    const registry = new SceneryRegistry();
    registry.setVisible('crowd', false);
    const late = new Object3D();
    registry.register('crowd', late);
    expect(late.visible).toBe(false);
  });
});
