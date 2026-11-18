/** The camera of an imported stage follows its frame: a new window shape or layout fits the views again. */
import { describe, expect, it } from 'vitest';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { mvrViews } from '../../../../src/render/mvr/mvrViews';
import { boxInFrame, frameOf, smallestMargin } from '../camera/projectBox';
import { cameraViews } from './fohFrame';

const RIG: StageBounds = { min: [-20, 0, -14], max: [20, 14, 4] };
const WIDE: StageBounds = { min: [-95, 0, -30], max: [95, 28, 10] };

/** Sets the camera as `StageRenderer.resize` does for a canvas whose lowest `covered` pixels the console hides. */
function resize(v: ReturnType<typeof cameraViews>, width: number, height: number, covered = 0): void {
  v.camera.aspect = width / height;
  if (covered) v.camera.setViewOffset(width, height, 0, covered / 2, width, height);
  else v.camera.clearViewOffset();
  v.camera.updateProjectionMatrix();
}

describe('CameraViews with frame-fitted views', () => {
  it('fits the current view again when the window or the layout changes the frame', () => {
    const v = cameraViews();
    resize(v, 1920, 1080);
    v.fitTo(RIG, mvrViews(RIG, []));
    v.setView('front', true);
    const full = v.camera.position.z;
    resize(v, 2000, 1114, 520);
    v.updateControls();
    expect(v.camera.position.z).toBeGreaterThan(full);
    const view = { position: v.camera.position.toArray(), target: v.controls.target.toArray(), fov: v.camera.fov };
    expect(smallestMargin(boxInFrame(view, RIG, frameOf(2000, 1114, 520)))).toBeCloseTo(0.06, 3);
    expect(v.table.rig).toEqual(RIG);
  });

  it('leaves a camera the user moved where it is, and fits the next view button to the new frame', () => {
    const v = cameraViews();
    resize(v, 1920, 1080);
    v.fitTo(RIG, mvrViews(RIG, []));
    v.setView('front', true);
    v.controls.dispatchEvent({ type: 'start' });
    const moved = v.camera.position.clone();
    resize(v, 1024, 768);
    v.updateControls();
    expect(v.camera.position.distanceTo(moved)).toBeLessThan(1e-6);
    v.setView('front', true);
    expect(v.camera.position.z).toBeGreaterThan(moved.z);
  });

  it('opens the zoom and the clip planes to the scene, and gives the built-in ones back', () => {
    const v = cameraViews();
    v.fitTo(WIDE, mvrViews(WIDE, []));
    for (const name of ['foh', 'front', 'wide', 'side', 'top'] as const) {
      v.setView(name, true);
      const distance = v.camera.position.distanceTo(v.controls.target);
      expect(distance, name).toBeLessThan(v.controls.maxDistance);
      expect(distance + 200, name).toBeLessThan(v.camera.far);
      expect(distance, name).toBeGreaterThan(v.controls.minDistance);
    }
    expect(v.camera.far).toBeGreaterThan(1600);
    // level, or lower while the eye stays above the scene floor (`floorPolar`)
    expect(v.controls.maxPolarAngle).toBeGreaterThanOrEqual(Math.PI / 2);
    v.setView('crowd', true);
    expect(v.camera.position.y).toBeCloseTo(1.7);
    expect(v.controls.target.y).toBeGreaterThan(v.camera.position.y);
    v.fitTo(null);
    expect([v.camera.near, v.camera.far]).toEqual([0.1, 1600]);
    expect([v.controls.minDistance, v.controls.maxDistance]).toEqual([0, Infinity]);
    expect(v.controls.maxPolarAngle).toBe(Math.PI * 0.495);
    expect(v.table.rig).toBeNull();
  });
});
