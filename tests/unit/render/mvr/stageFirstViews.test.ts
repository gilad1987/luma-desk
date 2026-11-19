/**
 * Owns the stage-first rule of the Wide and Top views of an imported stage: the stage (the rig box) takes at least
 * 40 % of the free width in the overview (or 55 % of the height when the height binds) and its longer side at least
 * 40 % of the shorter frame side in the plan, whatever the house is; the house is whole when that leaves the stage
 * large, and cut at its far rows when not.
 */
import { describe, expect, it } from 'vitest';
import type { StageBounds, Vec3 } from '../../../../src/domain/stage/types';
import { boxShare } from '../../../../src/render/camera/boxShare';
import type { ViewFrame } from '../../../../src/render/camera/viewFrame';
import type { CameraView } from '../../../../src/render/camera/viewTable';
import { mvrViews } from '../../../../src/render/mvr/mvrViews';
import { seatCluster } from '../../../../src/render/mvr/seatCluster';
import { STAGE_SHARE } from '../../../../src/render/mvr/stageFirst';
import { boxInFrame, frameOf, smallestMargin } from '../camera/projectBox';

const FRAMES = [frameOf(2560, 1440), frameOf(2000, 1150, 420), frameOf(1024, 768)];
const STAGE: StageBounds = { min: [-13, 0, -9], max: [13, 12, 5] };
/** A house 51 m wide and 58 m deep in front of the stage. */
const DEEP: StageBounds = { min: [-25.5, 0, 8], max: [25.5, 2, 66] };
/** A site 190 m wide: the scene box, with lit panels far to both sides of the stage. */
const SITE: StageBounds = { min: [-95, 0, -30], max: [95, 28, 70] };
const FAR_PANELS: Vec3[] = [-90, -80, 80, 90].map((x): Vec3 => [x, 6, 20]);
/** A file without fixtures: its screens are the stage. */
const SCREENS: StageBounds = { min: [-18, 1, -4], max: [18, 9, 2] };

const wideFill = (view: CameraView, rig: StageBounds, frame: ViewFrame): number => {
  const share = boxShare(view, rig, frame);
  return Math.max(share.width / STAGE_SHARE.width, share.height / STAGE_SHARE.height);
};
const planFill = (view: CameraView, rig: StageBounds, frame: ViewFrame): number => {
  const share = boxShare(view, rig, frame);
  const longer = Math.max(share.width * frame.free.width, share.height * frame.free.height);
  return longer / (STAGE_SHARE.plan * Math.min(frame.free.width, frame.free.height));
};

describe.each(FRAMES)('the stage-first Wide and Top views (frame %#)', (frame) => {
  it('cuts the far rows of a deep house, only as far as the stage needs, and never the stage', () => {
    const { wide, top } = mvrViews(SITE, [], { stage: STAGE, seats: DEEP }).tableFor(frame);
    for (const [view, fill] of [
      [wide, wideFill(wide, STAGE, frame)],
      [top, planFill(top, STAGE, frame)],
    ] as const) {
      expect(fill).toBeGreaterThanOrEqual(0.999);
      expect(fill).toBeLessThan(1.01);
      expect(smallestMargin(boxInFrame(view, STAGE, frame))).toBeGreaterThan(0.0599);
    }
    // upstage is up in the plan, and the first rows are in frame below the stage
    const rows = boxInFrame(top, { min: [-13, 0, 8], max: [13, 2, 14] }, frame);
    expect(smallestMargin(rows)).toBeGreaterThan(0);
    expect(rows.top).toBeGreaterThan(boxInFrame(top, STAGE, frame).top);
  });

  it('frames the stage of a 190 m site, with the far panels counted and out of the framed box', () => {
    const { seats, far } = seatCluster([], FAR_PANELS, STAGE);
    const fitter = mvrViews(SITE, [], { stage: STAGE, ...(seats ? { seats } : {}), farProxies: far });
    const { wide, top } = fitter.tableFor(frame);
    expect([fitter.farProxies, fitter.house]).toEqual([4, STAGE]);
    expect(wideFill(wide, STAGE, frame)).toBeGreaterThanOrEqual(0.999);
    expect(planFill(top, STAGE, frame)).toBeGreaterThanOrEqual(0.999);
    for (const [x, y, z] of FAR_PANELS) {
      const panel = boxInFrame(top, { min: [x - 1, y - 1, z - 1], max: [x + 1, y + 1, z + 1] }, frame);
      expect(smallestMargin(panel)).toBeLessThan(0);
    }
  });

  it.each([
    ['a screens-only file: the screen cluster is the stage', SCREENS],
    ['a fixtures-only file: the rig box is the stage', STAGE],
  ])('fills the frame with %s', (_, rig) => {
    const { wide, top } = mvrViews(rig, [], { stage: rig }).tableFor(frame);
    for (const view of [wide, top]) {
      const at = boxInFrame(view, rig, frame);
      expect(smallestMargin(at)).toBeGreaterThan(0.0599);
      expect(Math.max(at.width, at.height)).toBeGreaterThan(0.6);
    }
  });

  it('keeps a house whole when the stage is large in it', () => {
    const seats: StageBounds = { min: [-13, 0, 6], max: [13, 2, 16] };
    const house: StageBounds = { min: [-13, 0, -9], max: [13, 12, 16] };
    const { wide, top } = mvrViews(SITE, [], { stage: STAGE, seats }).tableFor(frame);
    for (const view of [wide, top]) expect(smallestMargin(boxInFrame(view, house, frame))).toBeGreaterThan(0.0599);
  });
});
