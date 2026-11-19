/**
 * OrbitControls sends 'start' on every pointer down, also for a plain click (a fixture pick on the same canvas). Only
 * a gesture that moved the camera stops the frame-fitted view from fitting itself again.
 */
import { describe, expect, it } from 'vitest';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { mvrViews } from '../../../../src/render/mvr/mvrViews';
import { cameraViews } from './fohFrame';

const RIG: StageBounds = { min: [-20, 0, -14], max: [20, 14, 4] };

/** A camera on the fitted front view of a 16:9 frame; `reshape` makes it 4:3 and runs one frame of the controls. */
function onFront() {
  const v = cameraViews();
  v.camera.aspect = 16 / 9;
  v.camera.updateProjectionMatrix();
  v.fitTo(RIG, mvrViews(RIG, []));
  v.setView('front', true);
  const reshape = (): void => {
    v.camera.aspect = 4 / 3;
    v.camera.updateProjectionMatrix();
    v.updateControls();
  };
  return { v, reshape };
}

describe('CameraViews after a gesture of the orbit controls', () => {
  it('keeps fitting the view after a click that did not move the camera', () => {
    const { v, reshape } = onFront();
    const before = v.camera.position.clone();
    v.controls.dispatchEvent({ type: 'start' });
    v.controls.dispatchEvent({ type: 'end' });
    reshape();
    expect(v.camera.position.z).toBeGreaterThan(before.z + 0.1);
  });

  it('stops fitting the view after a drag that moved the camera', () => {
    const { v, reshape } = onFront();
    v.controls.dispatchEvent({ type: 'start' });
    v.camera.position.x += 0.5;
    v.controls.dispatchEvent({ type: 'end' });
    const moved = v.camera.position.clone();
    reshape();
    expect(v.camera.position.distanceTo(moved)).toBeLessThan(1e-6);
  });

  it('stops fitting the view after a drag that moved only the target (a pan)', () => {
    const { v, reshape } = onFront();
    v.controls.dispatchEvent({ type: 'start' });
    v.controls.target.y += 0.5;
    v.camera.position.y += 0.5;
    v.controls.dispatchEvent({ type: 'end' });
    const moved = v.camera.position.clone();
    reshape();
    expect(v.camera.position.distanceTo(moved)).toBeLessThan(1e-3);
  });
});
