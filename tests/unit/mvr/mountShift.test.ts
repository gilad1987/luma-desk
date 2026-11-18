import { describe, expect, it } from 'vitest';
import { MOUNT_HEIGHTS } from '../../../src/domain/fixtureTypes/mountHeights.ts';
import type { Quat, Vec3 } from '../../../src/domain/stage/types.ts';
import { mountShift, type PlacedPose } from '../../../src/mvr/design/mountShift.ts';

const HALF = Math.SQRT1_2;
/** A side-hung body on a ladder: the hung model turned 90 degrees about z, so its base points to -x. */
const SIDE: Quat = [0, 0, HALF, HALF];

/** Each axis of `actual` within 1e-9 of `expected`. */
function expectNear(actual: Vec3, expected: Vec3): void {
  actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis] ?? NaN, 9));
}

describe('mountShift', () => {
  it('hangs a hung body at rest below its mounting point by its hang height', () => {
    const pipe: PlacedPose = { type: 'wash', mount: 'hang', position: [1, 6, 2] };
    expectNear(mountShift(pipe, 'toBody'), [1, 6 - MOUNT_HEIGHTS.wash.hang, 2]);
  });

  it('stands a floor body at rest on the floor by its own floor height', () => {
    expectNear(mountShift({ type: 'spot', mount: 'floor', position: [0, 0, 3] }, 'toBody'), [0, 0.785, 3]);
    expectNear(mountShift({ type: 'par', mount: 'floor', position: [0, 0, 3] }, 'toBody'), [0, 0.374, 3]);
  });

  it('moves a turned-over floor body with a rotation by the hang height, up from the floor', () => {
    const turned: PlacedPose = { type: 'par', mount: 'floor', rotation: [1, 0, 0, 0], position: [0, 0, 0] };
    expectNear(mountShift(turned, 'toBody'), [0, MOUNT_HEIGHTS.par.hang, 0]);
  });

  it('moves a side-hung body along its own base axis, away from the ladder', () => {
    const ladder: PlacedPose = { type: 'spot', mount: 'hang', rotation: SIDE, position: [-8, 4, 0] };
    expectNear(mountShift(ladder, 'toBody'), [-8 + MOUNT_HEIGHTS.spot.hang, 4, 0]);
  });

  it('leaves a screen where it is: it has no model, so its origin is its mounting point', () => {
    expectNear(mountShift({ type: 'screen', mount: 'hang', position: [0, 5, -4] }, 'toBody'), [0, 5, -4]);
  });

  it('is its own inverse: toMount then toBody returns the desk position in every pose', () => {
    const poses: readonly PlacedPose[] = [
      { type: 'beam', mount: 'hang', position: [3, 7, -2] },
      { type: 'bar', mount: 'floor', position: [-1, 0.2, 4] },
      { type: 'profile', mount: 'hang', rotation: [0.183, 0.683, -0.183, 0.683], position: [2, 5, 1] },
    ];
    for (const pose of poses) {
      const mounting = mountShift(pose, 'toMount');
      expectNear(mountShift({ ...pose, position: mounting }, 'toBody'), pose.position);
    }
  });
});
