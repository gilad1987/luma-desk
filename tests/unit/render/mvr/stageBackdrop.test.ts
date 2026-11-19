/**
 * The On Stage eye stands in front of the upstage screen: a quarter of the floor depth in from the back edge was
 * behind the LED wall of a real file, and the view was one screen that filled the frame.
 */
import { describe, expect, it } from 'vitest';
import type { StageBounds, Vec3 } from '../../../../src/domain/stage/types';
import { stageBackdrop } from '../../../../src/render/mvr/stageBackdrop';
import { floorOf, stageViews } from '../../../../src/render/mvr/stageViews';

const stage: StageBounds = { min: [-12, 0, -10], max: [12, 11, 4] };
const deck = { x0: -8, x1: 8, z0: -8, z1: 2, height: 1.5 };
const floor = floorOf({ stage, deck });
/** An LED wall 6 m high across the deck, 4 m in from the back edge; a drum riser in front of it; a far tower. */
const WALL: StageBounds = { min: [-7, 1.5, -4.4], max: [7, 7.5, -4] };
const RISER: StageBounds = { min: [-2, 1.5, -3.5], max: [2, 2.1, -1.5] };
const TOWER: StageBounds = { min: [9, 0, -6], max: [10, 10, -5] };
const FRONT_FILL: StageBounds = { min: [-3, 1.5, 1], max: [3, 4, 1.4] };

describe('stageBackdrop', () => {
  it('is the house side of the wall across the centre line in the upstage half', () => {
    expect(stageBackdrop([WALL, RISER, TOWER, FRONT_FILL], [], floor)).toBe(-4);
  });

  it('is undefined without such a wall: a low riser, a tower to one side and a part downstage are none', () => {
    expect(stageBackdrop([RISER, TOWER, FRONT_FILL], [], floor)).toBeUndefined();
    expect(stageBackdrop([], [], floor)).toBeUndefined();
  });

  it('counts proxy panels on the centre line at eye height, which have no mesh', () => {
    const panels: Vec3[] = [
      [0.25, 3, -5],
      [0.25, 3.5, -4.8],
      [6, 3, -3.2],
      [0, 9, -3.4],
    ];
    expect(stageBackdrop([], panels, floor)).toBe(-4.8);
  });

  it('counts a wall of panels with a seam on the centre line, which no single box crosses', () => {
    const left: StageBounds = { min: [-7, 1.5, -4.4], max: [-0.02, 7.5, -4] };
    const right: StageBounds = { min: [0.02, 1.5, -4.4], max: [7, 7.5, -4] };
    expect(stageBackdrop([left, right], [], floor)).toBe(-4);
    expect(stageBackdrop([left], [], floor)).toBeUndefined();
  });

  it('passes a high riser mid-stage within 3 m of the eye, and looks over a low or a far one', () => {
    const high: StageBounds = { min: [-2, 1.5, -3.5], max: [2, 4, -1.5] };
    const farHigh: StageBounds = { min: [-2, 1.5, -2], max: [2, 4, -0.5] };
    expect(stageBackdrop([high], [], floor)).toBe(-1.5);
    // in front of the wall the eye is nearer to the riser, and passes it too
    expect(stageBackdrop([WALL, high], [], floor)).toBe(-1.5);
    expect(stageBackdrop([RISER], [], floor)).toBeUndefined();
    expect(stageBackdrop([farHigh], [], floor)).toBeUndefined();
  });

  it('does not count one person on the centre line, or a roof over the whole floor', () => {
    const person: StageBounds = { min: [-0.3, 1.5, -4.5], max: [0.3, 3.3, -4.2] };
    const roof: StageBounds = { min: [-9, 0, -9], max: [9, 10, 3] };
    expect(stageBackdrop([person, roof], [], floor)).toBeUndefined();
  });

  it('stands on the deck in front of the wall and the riser, and looks level into the house', () => {
    const high: StageBounds = { min: [-2, 1.5, -3.5], max: [2, 4, -1.5] };
    const box: StageBounds = { min: [-30, 0, -10], max: [30, 11, 60] };
    const backdrop = stageBackdrop([WALL, high], [], floor);
    const { position, target, fov } = stageViews(
      { stage, deck, ...(backdrop === undefined ? {} : { backdrop }) },
      box,
    ).stage;
    expect(position).toEqual([0, deck.height + 1.7, 0]);
    expect(position[2]).toBeLessThan(deck.z1);
    expect(target[1]).toBe(position[1]);
    expect(target[2]).toBeGreaterThan(stage.max[2]);
    expect(fov).toBeGreaterThanOrEqual(60);
    expect(fov).toBeLessThanOrEqual(75);
  });

  it('puts the On Stage eye in front of the backdrop, and a quarter in without one', () => {
    const box: StageBounds = { min: [-30, 0, -10], max: [30, 11, 60] };
    expect(stageViews({ stage, deck }, box).stage.position).toEqual([0, 3.2, -5.5]);
    const eye = stageViews({ stage, deck, backdrop: -4 }, box).stage.position;
    expect(eye).toEqual([0, 3.2, -2.5]);
    // a backdrop behind the quarter line moves nothing
    expect(stageViews({ stage, deck, backdrop: -7.5 }, box).stage.position).toEqual([0, 3.2, -5.5]);
  });
});
