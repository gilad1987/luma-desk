/**
 * Owns the clear zone of a whole-stage eye: it is in no drawn object and none stands between it and the stage. An
 * eye with a fault moves along its own sight line, then upward, in one fixed order; when no place is clear the best
 * one is kept and marked.
 */
import { describe, expect, it } from 'vitest';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { clearEye } from '../../../../src/render/camera/clearEye';
import { eyeFaults, stageZone } from '../../../../src/render/camera/eyeFaults';
import type { CameraView } from '../../../../src/render/camera/viewTable';
import { boxInFrame, frameOf, smallestMargin } from './projectBox';

const FRAME = frameOf(2000, 1150, 420);
const STAGE: StageBounds = { min: [-13, 0, -9], max: [13, 12, 5] };
/** The side elevation of the stage with the long lens, from stage left. */
const SIDE: CameraView = { position: [120, 6, -2], target: [0, 6, -2], fov: 25 };
const FRONT: CameraView = { position: [0, 6, 110], target: [0, 6, -2], fov: 25 };
const cube = (x: number, y: number, z: number, half: number): StageBounds => ({
  min: [x - half, y - half, z - half],
  max: [x + half, y + half, z + half],
});

describe('the clear zone of a whole-stage eye', () => {
  it('leaves a clear eye where it is, and so every view of a file without obstacles', () => {
    const truss = { min: [-13, 10, -9], max: [13, 11, 5] } as const;
    const hall = { min: [-60, 0, -40], max: [60, 30, 130] } as const;
    const zone = stageZone([truss, hall, cube(-80, 3, 0, 2)], STAGE);
    // the truss is a part of the stage and the hall a space around it: neither is in the way
    expect(zone.obstacles).toEqual([cube(-80, 3, 0, 2)]);
    expect(clearEye(SIDE, FRAME, zone, STAGE)).toBe(SIDE);
    expect(clearEye(SIDE, FRAME, { obstacles: [] })).toBe(SIDE);
  });

  it('moves an eye that is in a panel box toward the stage, past the wall of panels, with the rig in frame', () => {
    const wall = [-4, -2, 0, 2].flatMap((z) => [3, 5, 7, 9].map((y) => cube(120, y, z, 1)));
    const zone = stageZone(wall, STAGE);
    expect(eyeFaults(SIDE, FRAME, zone)).toBeGreaterThanOrEqual(1000);
    const view = clearEye(SIDE, FRAME, zone, STAGE);
    expect(view.faults).toBeUndefined();
    expect(eyeFaults(view, FRAME, zone)).toBe(0);
    expect(view.position[0]).toBeLessThan(120 - 2.5);
    expect([view.position[1], view.position[2], view.target]).toEqual([6, -2, SIDE.target]);
    expect(smallestMargin(boxInFrame(view, STAGE, FRAME))).toBeGreaterThan(0.0599);
  });

  it('steps past slabs that stand between the eye and the stage', () => {
    const slabs: StageBounds[] = [{ min: [60, 0, -12], max: [61, 14, 8] }];
    const view = clearEye(SIDE, FRAME, stageZone(slabs, STAGE), STAGE);
    expect(view.position[0]).toBeLessThan(60 - 1.5);
    expect(view.position[0]).toBeGreaterThan(STAGE.max[0]);
    expect(smallestMargin(boxInFrame(view, STAGE, FRAME))).toBeGreaterThan(0.0599);
  });

  it('stands in front of front-of-house fixtures and a screen that hang close at the wings', () => {
    const wings = [cube(-4, 7, 98, 0.3), cube(4, 7, 98, 0.3), { min: [3, 4, 90], max: [7, 7.5, 90.4] } as const];
    const zone = stageZone(wings, STAGE);
    // none is on a sight ray, but each is large in the long lens from 12 m
    expect(eyeFaults(FRONT, FRAME, zone)).toBe(30);
    const view = clearEye(FRONT, FRAME, zone, STAGE);
    // past the fixtures; the screen is then outside the frame, at the side of the eye
    expect(view.position[2]).toBeLessThan(98 - 0.3);
    expect(eyeFaults(view, FRAME, zone)).toBe(0);
    expect(smallestMargin(boxInFrame(view, STAGE, FRAME))).toBeGreaterThan(0.0599);
  });

  it('ignores the seats under a standing eye and a small fixture far from it', () => {
    const seats = [-2, -1, 0, 1, 2].map((x): StageBounds => ({ min: [x - 0.3, 0, 60], max: [x + 0.3, 0.85, 60.6] }));
    const foh: CameraView = { position: [0, 4, 62], target: [0, 6, -2], fov: 40 };
    expect(eyeFaults(foh, FRAME, stageZone([...seats, cube(4, 8, 30, 0.3)], STAGE))).toBe(0);
  });

  it('gives an eye that looks out from the stage 1.5 m around it and 3 m ahead', () => {
    const out: CameraView = { position: [0, 3.2, -4], target: [0, 3.2, 20], fov: 65 };
    const block = { min: [1, 1.5, -5], max: [3, 4, -3] } as const;
    const ahead = { min: [-1, 1.5, -2], max: [1, 4, -1.5] } as const;
    expect(eyeFaults(out, FRAME, { obstacles: [block] })).toBe(1000);
    expect(eyeFaults(out, FRAME, { obstacles: [ahead] })).toBeGreaterThanOrEqual(100);
    // a riser under the eye and a wall 8 m ahead are not in the way
    const riser = { min: [-2, 1.1, -6], max: [2, 1.5, -2] } as const;
    expect(eyeFaults(out, FRAME, { obstacles: [riser, { min: [-9, 0, 4], max: [9, 9, 5] }] })).toBe(0);
    const view = clearEye(out, FRAME, { obstacles: [block, ahead] });
    expect([view.faults, view.target, view.fov]).toEqual([undefined, out.target, 65]);
    expect(view.position[2]).toBeGreaterThan(-1.5);
  });

  it('keeps the best place and reports its faults when no place is clear', () => {
    const shell: StageBounds[] = [{ min: [20, -50, -200], max: [21, 300, 200] }];
    const view = clearEye(SIDE, FRAME, stageZone(shell, STAGE), STAGE);
    expect(view.faults).toBeGreaterThan(0);
    expect(view.faults).toBe(eyeFaults(view, FRAME, stageZone(shell, STAGE)));
    expect(clearEye(SIDE, FRAME, stageZone(shell, STAGE), STAGE)).toEqual(view);
  });
});
