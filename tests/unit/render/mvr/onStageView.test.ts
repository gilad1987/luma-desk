/**
 * Owns the On Stage view of files without a usual stage: a file without seats or without a deck in its stage box
 * gets an eye in the middle of the rig's footprint that looks to the house side, and a file without fixtures a look
 * at the front of its screens. The usual view (a performer upstage centre) stays for a stage with deck and seats.
 */
import { describe, expect, it } from 'vitest';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { mvrViews } from '../../../../src/render/mvr/mvrViews';
import { onStageView } from '../../../../src/render/mvr/onStageView';
import { stageViews } from '../../../../src/render/mvr/stageViews';
import { boxInFrame, frameOf, smallestMargin } from '../camera/projectBox';

const FRAMES = [frameOf(2560, 1440), frameOf(2000, 1150, 420), frameOf(1024, 768)];
const STAGE: StageBounds = { min: [-12, 0, -10], max: [12, 11, 4] };
const deck = { x0: -8, x1: 8, z0: -8, z1: 2, height: 1.5 };
const seats: StageBounds = { min: [-30, 0, 6], max: [30, 3, 60] };
const SCREENS: StageBounds = { min: [-18, 1, -4], max: [18, 9, 2] };
const usual = stageViews({ stage: STAGE, deck, seats }, STAGE).stage;

describe.each(FRAMES)('the On Stage view (frame %#)', (frame) => {
  it('keeps the performer upstage centre on a stage with its deck and seats', () => {
    expect(onStageView({ stage: STAGE, deck, seats }, usual, frame)).toBe(usual);
  });

  it('stands in the middle of the rig on the deck and looks downstage when the file has no seats', () => {
    const { position, target, fov } = onStageView({ stage: STAGE, deck }, usual, frame);
    expect(position).toEqual([0, 1.5 + 1.7, -3]);
    expect([target[0], target[1], fov]).toEqual([0, 1.5 + 1.7, 65]);
    expect(target[2]).toBeGreaterThan(position[2]);
  });

  it('stands on the box floor when the deck is not in the stage box, and looks to where the seats are', () => {
    const far = { x0: 100, x1: 116, z0: -8, z1: 2, height: 1.5 };
    const left: StageBounds = { min: [-70, 0, -10], max: [-20, 3, 4] };
    const { position, target } = onStageView({ stage: STAGE, deck: far, seats: left }, usual, frame);
    expect(position).toEqual([0, 1.7, -3]);
    expect(target[0]).toBeLessThan(-11);
    expect(target[2]).toBeCloseTo(-3, 6);
  });

  it('looks at the front of the screens of a file without fixtures, from the ground, all of them in frame', () => {
    const view = onStageView({ stage: SCREENS, isScreensOnly: true }, usual, frame);
    expect(view.position[1]).toBeCloseTo(1 + 1.7);
    expect(view.position[2]).toBeGreaterThan(SCREENS.max[2] + 3);
    expect(view.target).toEqual([0, 5, -1]);
    expect(view.fov).toBeGreaterThanOrEqual(46);
    expect(view.fov).toBeLessThanOrEqual(75);
    expect(smallestMargin(boxInFrame(view, SCREENS, frame))).toBeGreaterThan(0.05);
  });

  it('gives the eye of both views a clear zone among the fixture bodies', () => {
    const body: StageBounds = { min: [-0.3, 2.9, -2.3], max: [0.3, 3.5, -1.7] };
    const place = { stage: STAGE, deck, obstacles: [body] };
    const { stage, ring } = mvrViews(STAGE, [], place).tableFor(frame);
    // the body hangs 1 m in front of the eye at lens height: the eye steps past it
    expect(stage.position[2]).toBeGreaterThan(-1.7 + 1.5);
    expect([stage.faults, ring]).toEqual([undefined, stage]);
  });
});
