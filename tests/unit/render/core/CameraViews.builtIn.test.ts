/**
 * The built-in stage does not change with the frame-fitted views of an imported stage: its view table is the same
 * object, and every number of every view, clip plane and orbit limit is strictly equal on a camera that never showed
 * an imported stage and on one that did.
 */
import { describe, expect, it } from 'vitest';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { isViewName, VIEWS, type ViewName } from '../../../../src/render/camera/viewTable';
import { mvrViews } from '../../../../src/render/mvr/mvrViews';
import { cameraViews } from './fohFrame';

const RIG: StageBounds = { min: [-20, 0, -14], max: [20, 14, 4] };
const SEATS: StageBounds = { min: [-25, 0, 8], max: [25, 3, 50] };
const NAMES = Object.keys(VIEWS).filter(isViewName);

type Views = ReturnType<typeof cameraViews>;

/** Every number the camera holds after an instant move to `name` and one frame of the controls. */
function numbers(v: Views, name: ViewName): number[] {
  v.setView(name, true);
  v.updateControls();
  const { camera, controls } = v;
  return [
    ...camera.position.toArray(),
    ...controls.target.toArray(),
    ...camera.quaternion.toArray(),
    ...camera.projectionMatrix.toArray(),
    camera.fov,
    camera.near,
    camera.far,
    controls.minDistance,
    controls.maxDistance,
    controls.maxPolarAngle,
  ];
}

describe('the built-in view table with the fitted-view code path', () => {
  it('is the same table and the same camera numbers after an imported stage was shown', () => {
    const fresh = cameraViews();
    const used = cameraViews();
    used.fitTo(RIG, mvrViews(RIG, [], { stage: RIG, seats: SEATS, outliers: 3 }));
    for (const name of NAMES) numbers(used, name);
    used.fitTo(null);
    expect(used.table.views).toStrictEqual(VIEWS);
    expect(fresh.table.views).toBe(VIEWS);
    expect([used.table.rig, used.table.house, used.table.scene, used.table.outliers]).toEqual([null, null, null, 0]);
    for (const name of NAMES) {
      const [a, b] = [numbers(fresh, name), numbers(used, name)];
      a.forEach((value, i) => expect(Object.is(value, b[i]), `${name} number ${i}`).toBe(true));
    }
  });

  it('drops a fitter passed for the built-in stage', () => {
    const v = cameraViews();
    v.fitTo(null, mvrViews(RIG, []));
    expect(v.table.views).toBe(VIEWS);
    expect(v.table.rig).toBeNull();
    expect(v.table.scene).toBeNull();
    expect(v.controls.maxPolarAngle).toBe(Math.PI * 0.495);
  });

  it('computes the fitted views once per frame shape, not once per frame', () => {
    const v = cameraViews();
    const fitter = mvrViews(RIG, []);
    let calls = 0;
    v.fitTo(RIG, { rig: fitter.rig, scene: fitter.scene, tableFor: (frame) => (calls++, fitter.tableFor(frame)) });
    for (let frame = 0; frame < 5; frame++) v.updateControls();
    expect(calls).toBe(1);
    v.camera.aspect = 4 / 3;
    v.updateControls();
    expect(calls).toBe(2);
  });
});
