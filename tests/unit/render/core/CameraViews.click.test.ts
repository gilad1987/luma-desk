/**
 * OrbitControls sends 'start' on every pointer down, also for a plain click (a fixture pick on the same canvas). Only
 * a gesture that moved the camera stops the frame-fitted view from fitting itself again.
 */
import { describe, expect, it } from 'vitest';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { CameraViews } from '../../../../src/render/camera/CameraViews';
import { mvrViews } from '../../../../src/render/mvr/mvrViews';
import { asReal } from '../../../shared/dom';
import { cameraViews } from './fohFrame';

const RIG: StageBounds = { min: [-20, 0, -14], max: [20, 14, 4] };

/** A canvas that dispatches pointer events to the real OrbitControls handlers, 600 px high as their rotate scale. */
function pointerCanvas(): HTMLCanvasElement {
  const capture = { setPointerCapture: () => {}, releasePointerCapture: () => {} };
  return asReal<HTMLCanvasElement>(Object.assign(new EventTarget(), { style: {}, clientHeight: 600, ...capture }));
}

/** A left-button mouse event of `type` at (x, 0), as the browser sends it to the canvas. */
function pointer(v: CameraViews, type: string, x: number): void {
  const fields = { pointerId: 1, pointerType: 'mouse', button: 0, clientX: x, clientY: 0 };
  v.controls.domElement.dispatchEvent(Object.assign(new Event(type), fields));
}

/** A camera on the fitted front view of a 16:9 frame; `reshape` makes it 4:3 and runs one frame of the controls. */
function onFront(v = cameraViews()) {
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
    v.controls.dispatchEvent({ type: 'end' });
    const moved = v.camera.position.clone();
    reshape();
    expect(v.camera.position.distanceTo(moved)).toBeLessThan(1e-3);
  });

  // the controls turn the camera on every pointer move, so a pick with a few pixels of travel turns it a little (R2-38)
  it.each([
    ['keeps fitting the view after a 3 px click that turned the camera a little', 3, true],
    ['stops fitting the view after a 20 px drag', 20, false],
  ])('%s', (_label, travel, isFitted) => {
    const views = new CameraViews(pointerCanvas(), { isMaLayout: () => false, onViewChanged: () => undefined });
    const { v, reshape } = onFront(views);
    v.controls.enableDamping = false;
    const before = v.camera.position.clone();
    pointer(v, 'pointerdown', 100);
    pointer(v, 'pointermove', 100 + travel);
    pointer(v, 'pointerup', 100 + travel);
    const turned = v.camera.position.clone();
    expect(turned.distanceTo(before)).toBeGreaterThan(0.01);
    reshape();
    expect(v.camera.position.distanceTo(turned) > 0.1).toBe(isFitted);
  });
});
