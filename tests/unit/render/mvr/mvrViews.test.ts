/**
 * The framing views of an imported stage, checked by projecting the stage box through each view's 16:9 frustum:
 * FOH fills about 75% of the frame width, the overview about half, top and side about 80%, and the FOH eye stands
 * behind far FOH fixtures with a narrower lens.
 */
import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { StageBounds, Vec3 } from '../../../../src/domain/stage/types';
import type { CameraView } from '../../../../src/render/camera/viewTable';
import { mvrViews } from '../../../../src/render/mvr/mvrViews';

/** The box's projected extent in a 16:9 frame (fractions of the frame width and height) and whether it is all in. */
function frameOf(view: CameraView, { min, max }: StageBounds): { width: number; height: number; inside: boolean } {
  const camera = new PerspectiveCamera(view.fov ?? 46, 16 / 9, 0.1, 5000);
  camera.position.set(...view.position);
  camera.lookAt(...view.target);
  camera.updateMatrixWorld();
  const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
    new Vector3(i & 1 ? max[0] : min[0], i & 2 ? max[1] : min[1], i & 4 ? max[2] : min[2]).project(camera),
  );
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const inside = corners.every((c) => Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1 && c.z < 1);
  return { width: (Math.max(...xs) - Math.min(...xs)) / 2, height: (Math.max(...ys) - Math.min(...ys)) / 2, inside };
}

const BOXES: readonly StageBounds[] = [
  { min: [-8, 0, -6], max: [8, 6, 2] },
  { min: [-20, 0, -14], max: [20, 14, 4] },
  { min: [-35, 0, -20], max: [35, 22, 6] },
];

describe('mvrViews', () => {
  it.each(BOXES)('frames the box from FOH at about 75%% of the frame width (%#)', (box) => {
    const { width, inside } = frameOf(mvrViews(box, []).foh, box);
    expect(inside).toBe(true);
    expect(width).toBeGreaterThan(0.6);
    expect(width).toBeLessThan(0.9);
  });

  it.each(BOXES)('keeps the box in the upper two thirds of the MA FOH frame (%#)', (box) => {
    const camera = mvrViews(box, []).fohMa;
    expect(camera.fov).toBe(60);
    const { inside } = frameOf(camera, box);
    expect(inside).toBe(true);
    const low = new PerspectiveCamera(60, 16 / 9, 0.1, 5000);
    low.position.set(...camera.position);
    low.lookAt(...camera.target);
    low.updateMatrixWorld();
    expect(new Vector3(box.min[0], box.min[1], box.max[2]).project(low).y).toBeGreaterThan(-1 / 3 - 0.05);
  });

  it.each(BOXES)('frames the overview at about half, top and side at about 80% (%#)', (box) => {
    const views = mvrViews(box, []);
    const wide = frameOf(views.wide, box);
    expect(Math.max(wide.width, wide.height)).toBeGreaterThan(0.4);
    expect(Math.max(wide.width, wide.height)).toBeLessThan(0.6);
    expect(views.wide.position[0]).toBeLessThan(views.wide.target[0]);
    for (const view of [views.top, views.side]) {
      const { width, height, inside } = frameOf(view, box);
      expect(inside).toBe(true);
      expect(Math.max(width, height)).toBeGreaterThan(0.7);
    }
    expect(frameOf(views.front, box).width).toBeGreaterThan(frameOf(views.foh, box).width);
  });

  it('stands the FOH eye behind far FOH fixtures and narrows the lens to keep the fill', () => {
    const box = BOXES[0] as StageBounds;
    const spots: readonly Vec3[] = [
      [-2, 3, 60],
      [2, 3, 60],
    ];
    const foh = mvrViews(box, spots).foh;
    expect(foh.position[2]).toBeGreaterThan(60);
    expect(foh.fov).toBeLessThan(46);
    expect(frameOf(foh, box).width).toBeGreaterThan(0.6);
    expect(mvrViews(box, [[0, 3, 5]]).foh).toEqual(mvrViews(box, []).foh);
  });
});
