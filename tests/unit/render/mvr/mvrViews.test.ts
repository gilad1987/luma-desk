/**
 * The framing views of an imported stage, projected as the renderer draws them (`projectBox`): every whole-stage view
 * holds its box in the free rectangle of any frame from 4:3 to 32:9, with or without the MA console, and fills it.
 */
import { describe, expect, it } from 'vitest';
import type { StageBounds, Vec3 } from '../../../../src/domain/stage/types';
import { FIT_MARGIN } from '../../../../src/render/camera/viewFrame';
import { mvrViews } from '../../../../src/render/mvr/mvrViews';
import type { StagePlace } from '../../../../src/render/mvr/stageViews';
import { boxInFrame, frameOf, smallestMargin } from '../camera/projectBox';

const RIGS: readonly StageBounds[] = [
  { min: [-8, 0, -6], max: [8, 6, 2] },
  { min: [-20, 0, -14], max: [20, 14, 4] },
  { min: [-95, 0, -30], max: [95, 28, 10] },
];
/** The house box of a rig: the rig and seat rows 50 m out in front of it. */
const withSeats = ({ min, max }: StageBounds): StageBounds => ({ min, max: [max[0], max[1], max[2] + 50] });
const seated = (stage: StageBounds): StagePlace => ({ stage, seats: { min: stage.max, max: withSeats(stage).max } });
const FRAMES = [
  frameOf(1024, 768),
  frameOf(1280, 720),
  frameOf(3840, 2160),
  frameOf(3840, 1080),
  frameOf(1280, 684, 300),
  frameOf(2000, 1114, 520),
  frameOf(2560, 1044, 560),
];
const cases = RIGS.flatMap((rig) => FRAMES.map((frame) => ({ rig, frame })));

describe('mvrViews', () => {
  it.each(cases)('holds the rig box in the free rectangle from FOH, front and side (%#)', ({ rig, frame }) => {
    const views = mvrViews(withSeats(rig), [], seated(rig)).tableFor(frame);
    for (const name of ['foh', 'fohMa', 'front', 'side'] as const) {
      const at = boxInFrame(views[name], rig, frame);
      expect(smallestMargin(at), name).toBeGreaterThan(FIT_MARGIN - 1e-6);
      expect(Math.max(at.width, at.height), name).toBeGreaterThan(0.8);
    }
  });

  it.each(cases)('holds the rig whole in the free rectangle from wide and top (%#)', ({ rig, frame }) => {
    const scene = withSeats(rig);
    const views = mvrViews(scene, [], seated(rig)).tableFor(frame);
    for (const name of ['wide', 'top'] as const) {
      expect(smallestMargin(boxInFrame(views[name], rig, frame)), name).toBeGreaterThan(FIT_MARGIN - 1e-6);
      const at = boxInFrame(views[name], scene, frame);
      expect(Math.max(at.width, at.height), name).toBeGreaterThan(0.6);
    }
  });

  it('draws the elevations level with a long lens and the plan with upstage at the top', () => {
    const rig = RIGS[1] as StageBounds;
    const frame = frameOf(1920, 1080);
    const { front, side, top, wide, foh } = mvrViews(withSeats(rig), [], seated(rig)).tableFor(frame);
    expect([front.fov, side.fov]).toEqual([25, 25]);
    expect(front.position[1]).toBe(front.target[1]);
    expect(front.position[0]).toBe(0);
    expect(side.position[1]).toBe(side.target[1]);
    expect(side.position[0]).toBeGreaterThan(rig.max[0]);
    const upstage = boxInFrame(top, { min: [0, 0, rig.min[2]], max: [0, 0, rig.min[2]] }, frame);
    const downstage = boxInFrame(top, { min: [0, 0, rig.max[2]], max: [0, 0, rig.max[2]] }, frame);
    expect(upstage.top).toBeLessThan(downstage.top);
    expect(wide.position[0]).toBeLessThan(wide.target[0]);
    expect(wide.position[1]).toBeGreaterThan(rig.max[1]);
    expect(foh.target).toEqual([0, 7, -5]);
    expect(foh.position[1]).toBeGreaterThan(foh.target[1]);
  });

  it('stands the FOH eye in the house and zooms the lens; far FOH fixtures move it behind them', () => {
    const rig = RIGS[1] as StageBounds;
    const frame = frameOf(1920, 1080);
    const house = mvrViews(withSeats(rig), [], seated(rig)).tableFor(frame).foh;
    expect(house.position[2]).toBeCloseTo(rig.max[2] + 0.65 * 50, 3);
    expect(house.fov).toBeLessThan(46);
    const spots: readonly Vec3[] = [
      [-2, 3, 60],
      [2, 3, 60],
    ];
    const behind = mvrViews(withSeats(rig), spots, seated(rig)).tableFor(frame).foh;
    expect(behind.position[2]).toBeCloseTo(65, 3);
    expect(behind.fov).toBeLessThan(house.fov ?? 0);
    expect(mvrViews(withSeats(rig), [[0, 3, 1]], seated(rig))).toEqual(mvrViews(withSeats(rig), [], seated(rig)));
  });

  it('walks the FOH eye in along its sight line when the lens would go below its limit', () => {
    const rig = RIGS[0] as StageBounds;
    const far = mvrViews(withSeats(rig), [[0, 3, 200]], seated(rig)).tableFor(frameOf(1920, 1080)).foh;
    expect(far.fov).toBe(20);
    expect(far.position[2]).toBeLessThan(200);
  });

  it('keeps the long lens of the elevations and the plan for a rig 190 m wide, at any distance', () => {
    const frame = frameOf(2000, 1114, 520);
    const { front, side, top } = mvrViews(RIGS[2] as StageBounds, []).tableFor(frame);
    expect([front.fov, side.fov, top.fov]).toEqual([25, 25, 25]);
    // no cap on the eye: the black picture from 270 m was a NaN normal of a fixture model, not the distance
    expect(front.position[2] - front.target[2]).toBeGreaterThan(270);
    expect(mvrViews(RIGS[1] as StageBounds, []).tableFor(frame).front.fov).toBe(25);
  });
});
