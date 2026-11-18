/**
 * CameraViews: camera and orbit settings, the view table, MA FOH mapping and the animated view change. Real
 * WebGL output is owned by the Playwright screenshot suite.
 */
import { Object3D } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DECK } from '../../../../src/domain/venue';
import { CameraViews } from '../../../../src/render/camera/CameraViews';
import { VIEWS } from '../../../../src/render/camera/viewTable';
import { fakeCanvas } from '../fakeCanvas';
import { queuedAnimationFrames } from './queuedAnimationFrames';

function views(ma = false): { views: CameraViews; changed: string[] } {
  const changed: string[] = [];
  const cameraViews = new CameraViews(fakeCanvas(), {
    isMaLayout: () => ma,
    onViewChanged: (view) => changed.push(view),
  });
  return { views: cameraViews, changed };
}

function expectNear(actual: readonly number[], expected: readonly number[]): void {
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i] ?? NaN, 9));
}

afterEach(() => vi.unstubAllGlobals());

describe('CameraViews', () => {
  it('builds the legacy camera and orbit settings', () => {
    const { views: v } = views();
    expect([v.camera.fov, v.camera.near, v.camera.far]).toEqual([46, 0.1, 1600]);
    expect(v.controls.enableDamping).toBe(true);
    expect(v.controls.dampingFactor).toBe(0.08);
    expect(v.controls.maxPolarAngle).toBe(Math.PI * 0.495);
  });

  it('has the 15 legacy views, with the deck height in the stage-level ones', () => {
    expect(Object.keys(VIEWS)).toHaveLength(15);
    expect(VIEWS.drums?.position).toEqual([2.2, DECK + 3.2, -5.5]);
  });

  it('jumps at once to a view without reporting it', () => {
    const { views: v, changed } = views();
    v.setView('top', true);
    // the instant path runs controls.update(), which re-derives the pose from the orbit (float noise only)
    expectNear(v.camera.position.toArray(), [0, 86, -9]);
    expectNear(v.controls.target.toArray(), [0, 0, -9.1]);
    expect(v.currentView).toBe('top');
    expect(changed).toEqual([]);
  });

  it('maps FOH to the MA operator eye with a 60 degree lens and hides the FOH rig', () => {
    const { views: v } = views(true);
    const desk = new Object3D();
    v.fohRig.add(desk);
    v.setView('foh', true);
    expect(v.camera.fov).toBe(60);
    expectNear(v.controls.target.toArray(), [0, 9.5, -8]);
    expect(v.currentView).toBe('foh');
    expect(desk.visible).toBe(false);
    v.setView('side', true);
    expect([v.camera.fov, desk.visible]).toEqual([46, true]);
  });

  it('animates over 700 ms on its own frame chain and reports the view', () => {
    const frames = queuedAnimationFrames();
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { views: v, changed } = views();
    v.setView('top', true);
    v.setView('side');
    expect(changed).toEqual(['side']);
    expect(v.camera.position.y).toBeCloseTo(86, 9);
    now = 1350;
    frames.run();
    expect(v.camera.position.x).toBeCloseTo(31, 10);
    now = 1700;
    frames.run();
    expect(v.camera.position.toArray()).toEqual([62, 13, -8]);
    expect(frames.pending()).toBe(0);
  });
});
