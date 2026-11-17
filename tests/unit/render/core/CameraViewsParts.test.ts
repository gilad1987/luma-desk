/**
 * The view tween timing and easing, and the FOH rig visibility handle. The DOM button state is the UI's job.
 */
import { Object3D, PerspectiveCamera, Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FohRig } from '../../../../src/render/camera/FohRig';
import { smoothstep01, tweenCamera } from '../../../../src/render/camera/tweenCamera';
import { queuedAnimationFrames } from './queuedAnimationFrames';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('smoothstep01', () => {
  it('eases 0..1 with the legacy k * k * (3 - 2k)', () => {
    expect([smoothstep01(0), smoothstep01(0.5), smoothstep01(1)]).toEqual([0, 0.5, 1]);
    expect(smoothstep01(0.25)).toBe(0.25 * 0.25 * (3 - 2 * 0.25));
  });
});

describe('tweenCamera', () => {
  it('runs the first step at once and stops after 700 ms', () => {
    const frames = queuedAnimationFrames();
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const camera = new PerspectiveCamera();
    const target = new Vector3();
    const from = { position: new Vector3(0, 0, 0), target: new Vector3(0, 0, 0) };
    const to = { position: new Vector3(10, 0, 0), target: new Vector3(0, 10, 0) };
    tweenCamera(camera, target, from, to);
    expect(camera.position.x).toBe(0);
    expect(frames.pending()).toBe(1);
    now = 175;
    frames.run();
    expect(camera.position.x).toBeCloseTo(10 * smoothstep01(0.25), 12);
    now = 2000;
    frames.run();
    expect([camera.position.x, target.y, frames.pending()]).toEqual([10, 10, 0]);
  });
});

describe('FohRig', () => {
  it('starts members visible and lets a late member copy the first one', () => {
    const rig = new FohRig();
    const riser = new Object3D();
    const desk = new Object3D();
    rig.add(riser, desk);
    expect([riser.visible, desk.visible]).toEqual([true, true]);
    rig.setVisible(false);
    const roboSpot = new Object3D();
    rig.add(roboSpot);
    expect(roboSpot.visible).toBe(false);
    rig.setVisible(true);
    expect([riser.visible, desk.visible, roboSpot.visible]).toEqual([true, true, true]);
  });
});
