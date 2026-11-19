/**
 * The Crowd button means on an imported stage what it means on the built-in one (`VIEWS.crowd`): the eye is in the
 * house and looks at the stage. It stood on the deck edge and looked at the house before.
 */
import { describe, expect, it } from 'vitest';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { floorPolar } from '../../../../src/render/camera/viewRange';
import { VIEWS } from '../../../../src/render/camera/viewTable';
import { crowdView } from '../../../../src/render/mvr/crowdView';
import { mvrViews } from '../../../../src/render/mvr/mvrViews';
import { boxInFrame, frameOf } from '../camera/projectBox';

const stage: StageBounds = { min: [-12, 0, -10], max: [12, 11, 4] };
const deck = { x0: -8, x1: 8, z0: -8, z1: 2, height: 1.5 };
/** Seat rows from 3 m in front of the deck to 60 m, the floor 0.2 m below the stage floor, raked to 4 m. */
const seats: StageBounds = { min: [-30, -0.2, 5], max: [30, 4, 60] };
const FRAMES = [frameOf(1920, 1080), frameOf(1600, 1200), frameOf(2000, 1150, 400)];

describe('crowdView', () => {
  it('stands in the house and looks at the stage, as the built-in view does', () => {
    expect(VIEWS.crowd.position[2]).toBeGreaterThan(VIEWS.crowd.target[2]);
    for (const frame of FRAMES) {
      const { position, target } = crowdView({ stage, deck, seats }, frame);
      expect(position[2]).toBeGreaterThan(stage.max[2]);
      expect(target[2]).toBeLessThan(deck.z1);
      expect(target[2]).toBeGreaterThan(deck.z0);
      expect(position[0]).toBe(0);
    }
  });

  it('stands in the first third of the seat rows at a standing eye height over their floor', () => {
    const { position, target } = crowdView({ stage, deck, seats }, frameOf(1920, 1080));
    expect(position[2]).toBeGreaterThanOrEqual(seats.min[2]);
    expect(position[2]).toBeLessThanOrEqual(seats.min[2] + (seats.max[2] - seats.min[2]) / 3);
    expect(position[1]).toBeCloseTo(seats.min[1] + 1.7);
    // a look up at the rig; the orbit limit of an imported stage lets the eye stay there
    expect(target[1]).toBeGreaterThan(position[1]);
    const distance = Math.hypot(position[1] - target[1], position[2] - target[2]);
    const polar = Math.acos((position[1] - target[1]) / distance);
    expect(floorPolar({ min: [-30, -0.2, -10], max: [30, 11, 60] }, target[1], distance)).toBeGreaterThan(polar);
    expect(floorPolar({ min: [-30, -0.2, -10], max: [30, 11, 60] }, -5, distance)).toBe(Math.PI / 2);
  });

  it('stands 6 to 10 m in front of the deck when the seats are only behind the stage', () => {
    const behind: StageBounds = { min: [-30, 0, -40], max: [30, 4, -12] };
    const { position } = crowdView({ stage, deck, seats: behind }, frameOf(1920, 1080));
    expect(position[2] - deck.z1).toBeGreaterThanOrEqual(6);
    expect(position[2] - deck.z1).toBeLessThanOrEqual(10);
    expect(position[1]).toBeCloseTo(stage.min[1] + 1.7);
  });

  it('holds the full rig width in frame when the file has no seats, from as near as the lens allows', () => {
    const broad: StageBounds = { min: [-30, 0, -10], max: [30, 11, 4] };
    for (const frame of FRAMES)
      for (const rig of [stage, broad]) {
        const view = crowdView({ stage: rig, deck }, frame);
        const face: StageBounds = { min: [rig.min[0], rig.min[1], rig.max[2]], max: rig.max };
        const at = boxInFrame(view, face, frame);
        expect(Math.min(at.left, at.right, at.top, at.bottom)).toBeGreaterThan(0.0599);
        expect(view.fov).toBeLessThanOrEqual(75);
        expect(view.position[2] - deck.z1).toBeGreaterThanOrEqual(6);
        expect(view.position[1]).toBeCloseTo(rig.min[1] + 1.7);
      }
  });

  it('holds a 240 m rig without seats in frame too: the eye moves back past 100 m', () => {
    const wide: StageBounds = { min: [-120, 0, -10], max: [120, 11, 4] };
    for (const frame of [frameOf(1600, 1200), frameOf(1920, 1080)]) {
      const view = crowdView({ stage: wide, deck }, frame);
      const at = boxInFrame(view, { min: [-120, 0, 4], max: wide.max }, frame);
      expect(Math.min(at.left, at.right, at.top, at.bottom)).toBeGreaterThan(0.0599);
      expect(view.fov).toBeLessThanOrEqual(75);
    }
  });

  it('holds the full rig height in the free rectangle, with a lens of 46 to 75 degrees', () => {
    const tall: StageBounds = { min: [-12, 0, -10], max: [12, 24, 4] };
    for (const frame of FRAMES)
      for (const rig of [stage, tall]) {
        const view = crowdView({ stage: rig, deck, seats }, frame);
        const face: StageBounds = { min: [0, rig.min[1], rig.max[2]], max: [0, rig.max[1], rig.max[2]] };
        const at = boxInFrame(view, face, frame);
        expect(at.top).toBeGreaterThanOrEqual(0.059);
        expect(at.bottom).toBeGreaterThanOrEqual(0.059);
        expect(view.fov).toBeGreaterThanOrEqual(46);
        expect(view.fov).toBeLessThanOrEqual(75);
      }
  });

  it('is the Crowd view of the fitted table, computed for the frame', () => {
    const frame = frameOf(1920, 1080);
    expect(mvrViews(stage, [], { stage, deck, seats }).tableFor(frame).crowd).toEqual(
      crowdView({ stage, deck, seats }, frame),
    );
  });
});
