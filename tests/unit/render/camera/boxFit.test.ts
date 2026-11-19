/** The fit maths: all eight corners against both fields of view, the lens fit and the view offset. */
import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { boxCentre, boxCorners, eyeAt, fitDistance, fitFov, unit } from '../../../../src/render/camera/boxFit';
import { axisShift, FIT_MARGIN, frameOf as cameraFrame, freeTangents } from '../../../../src/render/camera/viewFrame';
import type { CameraView } from '../../../../src/render/camera/viewTable';
import { boxInFrame, frameOf, smallestMargin } from './projectBox';

const BOX: StageBounds = { min: [-20, 0, -14], max: [20, 14, 4] };
const FRAMES = [frameOf(1024, 768), frameOf(1920, 1080), frameOf(3840, 1080), frameOf(2000, 1114, 520)];
const DIRECTIONS = [
  [0, 0, -1],
  [-1, 0, 0],
  [0, -1, -0.002],
  [0.5, -0.5, -0.7],
] as const;

function fitted(dir: readonly [number, number, number], fov: number, frame: (typeof FRAMES)[number]): CameraView {
  const target = boxCentre(BOX);
  const distance = fitDistance({ corners: boxCorners(BOX), centre: target, dir: [...dir] }, freeTangents(fov, frame));
  return { position: eyeAt(target, [...dir], distance), target, fov };
}

describe('boxFit', () => {
  it('lists the eight corners of a box', () => {
    const corners = boxCorners(BOX);
    expect(new Set(corners.map((corner) => corner.join())).size).toBe(8);
    expect(corners).toContainEqual([-20, 14, 4]);
    expect(corners).toContainEqual([20, 0, -14]);
  });

  it.each(FRAMES)('holds every corner in the free rectangle and touches the margin on one side (%#)', (frame) => {
    for (const dir of DIRECTIONS) {
      const margin = smallestMargin(boxInFrame(fitted(dir, 46, frame), BOX, frame));
      expect(margin).toBeCloseTo(FIT_MARGIN, 4);
    }
  });

  it('lets the vertical field decide in a wide frame and the horizontal one in a narrow frame', () => {
    const wide = boxInFrame(fitted([0, 0, -1], 25, frameOf(3840, 1080)), BOX, frameOf(3840, 1080));
    expect(Math.min(wide.top, wide.bottom)).toBeCloseTo(FIT_MARGIN, 4);
    expect(Math.min(wide.left, wide.right)).toBeGreaterThan(0.1);
    const narrow = boxInFrame(fitted([0, 0, -1], 25, frameOf(1024, 768)), BOX, frameOf(1024, 768));
    expect(Math.min(narrow.left, narrow.right)).toBeCloseTo(FIT_MARGIN, 4);
    expect(Math.min(narrow.top, narrow.bottom)).toBeGreaterThan(FIT_MARGIN);
  });

  it('measures the near corners, not the box width: a deep box seen from the front needs more distance', () => {
    const tan = freeTangents(46, frameOf(1920, 1080));
    const flat: StageBounds = { min: [-20, 0, -5], max: [20, 14, -5] };
    const centre = boxCentre(flat);
    const far = fitDistance({ corners: boxCorners(BOX), centre, dir: [0, 0, -1] }, tan);
    expect(far - fitDistance({ corners: boxCorners(flat), centre, dir: [0, 0, -1] }, tan)).toBeCloseTo(9);
  });

  it('finds the lens that fits from a fixed place: the distance fit with that lens gives the place back', () => {
    const sight = { corners: boxCorners(BOX), centre: boxCentre(BOX), dir: unit([0, -3, -50]) };
    for (const frame of FRAMES) {
      const fov = fitFov(sight, 60, frame);
      expect(fitDistance(sight, freeTangents(fov, frame))).toBeCloseTo(60, 6);
    }
    expect(fitFov({ ...sight, dir: [0, 0, -1] }, 5, frameOf(4, 3))).toBe(180);
  });

  it('shifts the optical axis to the centre of the free rectangle and reads the frame back from the camera', () => {
    const frame = frameOf(2000, 1114, 520);
    expect(axisShift(frame)).toEqual({ x: 0, y: 260 });
    expect(axisShift(frameOf(1920, 1080))).toEqual({ x: 0, y: 0 });
    const camera = new PerspectiveCamera(46, 2000 / 1114);
    expect(cameraFrame(camera)).toEqual(frameOf(2000 / 1114, 1));
    camera.setViewOffset(2000, 1114, 0, 260, 2000, 1114);
    expect(cameraFrame(camera)).toEqual(frame);
    const centre = boxInFrame(fitted([0, 0, -1], 25, frame), { min: boxCentre(BOX), max: boxCentre(BOX) }, frame);
    expect(centre.left).toBeCloseTo(0.5);
    expect(centre.top).toBeCloseTo(0.5);
  });
});
