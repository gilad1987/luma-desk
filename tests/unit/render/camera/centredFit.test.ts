/**
 * The overview looks down at an angle, so the near corners of the house box are larger on screen than the far ones.
 * A sight line through the box centre left one side of the frame empty; the centred fit stands nearer, both edges of
 * the tighter screen axis touch the margin, and the other axis is in the middle.
 */
import { describe, expect, it } from 'vitest';
import type { Vec3Tuple } from '../../../../src/core';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { boxCentre, boxCorners, cross, dot, fitDistance, sub, unit } from '../../../../src/render/camera/boxFit';
import { centredView } from '../../../../src/render/camera/centredFit';
import { FIT_MARGIN, freeTangents, type ViewFrame } from '../../../../src/render/camera/viewFrame';

/** A stage with a deep seat area, and the direction of the overview: from audience left, 32 degrees down. */
const house: StageBounds = { min: [-25, 0, -21], max: [26, 17, 36] };
const dir: Vec3Tuple = [0.51, -0.53, -0.677];
const window: ViewFrame = { width: 1600, height: 900, free: { x: 0, y: 0, width: 1600, height: 900 } };
/** The console of the MA layout covers the lower part of the canvas. */
const console: ViewFrame = { width: 2000, height: 1150, free: { x: 0, y: 40, width: 2000, height: 600 } };
const FOV = 46;

/** The screen tangents of every corner of `box` from `eye` along `dir`: right and up of the sight line. */
function seen(box: StageBounds, eye: Vec3Tuple): { readonly x: number[]; readonly y: number[] } {
  const ahead = unit(dir);
  const right = unit(cross(ahead, [0, 1, 0]));
  const up = cross(right, ahead);
  const points = boxCorners(box).map((corner) => sub(corner, eye));
  return {
    x: points.map((p) => dot(p, right) / dot(p, ahead)),
    y: points.map((p) => dot(p, up) / dot(p, ahead)),
  };
}

describe('centredView', () => {
  it.each([window, console])('holds every corner inside the margin, the box in the middle (%#)', (frame) => {
    const { position, target } = centredView(house, dir, FOV, frame);
    const tan = freeTangents(FOV, frame);
    const fill = 1 - 2 * FIT_MARGIN;
    const { x, y } = seen(house, position);
    const edges = [Math.max(...x), -Math.min(...x), Math.max(...y), -Math.min(...y)];
    const [right = 0, left = 0, top = 0, bottom = 0] = edges;
    expect(right).toBeCloseTo(left);
    expect(top).toBeCloseTo(bottom);
    expect(right).toBeLessThanOrEqual(tan.h * fill + 1e-9);
    expect(top).toBeLessThanOrEqual(tan.v * fill + 1e-9);
    // the tighter axis is filled: both of its edges are on the margin
    expect(Math.max(right / (tan.h * fill), top / (tan.v * fill))).toBeCloseTo(1);
    // the sight line still ends in the plane of the box centre, so the orbit turns about the middle of the box
    expect(dot(sub(target, boxCentre(house)), unit(dir))).toBeCloseTo(0);
  });

  it('stands nearer than the fit through the box centre', () => {
    const { position, target } = centredView(house, dir, FOV, window);
    const centre = boxCentre(house);
    const through = fitDistance({ corners: boxCorners(house), centre, dir }, freeTangents(FOV, window));
    const distance = Math.hypot(...sub(position, target));
    expect(distance).toBeLessThan(0.9 * through);
    expect(distance).toBeGreaterThan(0.5 * through);
  });

  it('is the fit through the centre for a view that sees the box the same on both sides', () => {
    const level: Vec3Tuple = [0, 0, -1];
    const ahead = centredView(house, level, 25, window);
    const centre = boxCentre(house);
    const through = fitDistance({ corners: boxCorners(house), centre, dir: level }, freeTangents(25, window));
    ahead.target.forEach((value, i) => expect(value).toBeCloseTo(centre[i] ?? 0));
    expect(Math.hypot(...sub(ahead.position, ahead.target))).toBeCloseTo(through);
  });
});
