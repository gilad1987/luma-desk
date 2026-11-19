/**
 * The views of a very wide file frame its stage: the scene box (190 m, with sign boards and a tower) is framed by no
 * button and only sets how far the camera zooms out.
 */
import { describe, expect, it } from 'vitest';
import type { StageBounds, Vec3 } from '../../../../src/domain/stage/types';
import { mvrViews } from '../../../../src/render/mvr/mvrViews';
import { fohDepth } from '../../../../src/render/mvr/wholeStageViews';
import { boxInFrame, frameOf, smallestMargin } from '../camera/projectBox';
import { cameraViews } from '../core/fohFrame';

const FILE: StageBounds = { min: [-95, 0, -30], max: [95, 28, 70] };
const STAGE: StageBounds = { min: [-20, 0, -14], max: [20, 14, 4] };
const SEATS: StageBounds = { min: [-25, 0, 8], max: [25, 3, 50] };
const HOUSE: StageBounds = { min: [-25, 0, -14], max: [25, 14, 50] };
const FRAMES = [frameOf(1024, 768), frameOf(1920, 1080), frameOf(2000, 1114, 520)];

describe('mvrViews of a wide file', () => {
  const fitter = mvrViews(FILE, [], { stage: STAGE, seats: SEATS, outliers: 8 });

  it('keeps the three boxes apart and reports the outlier count', () => {
    expect(fitter.rig).toEqual(STAGE);
    expect(fitter.house).toEqual(HOUSE);
    expect(fitter.scene).toEqual(FILE);
    expect(fitter.outliers).toBe(8);
    expect(mvrViews(FILE, []).outliers).toBe(0);
    expect(mvrViews(FILE, [], { stage: STAGE }).house).toEqual(STAGE);
  });

  it.each(FRAMES)('fills the frame with the stage and the seats from wide and top (%#)', (frame) => {
    const views = fitter.tableFor(frame);
    for (const name of ['wide', 'top'] as const) {
      // the stage comes first (`stageFirst`): it is whole in frame, and the 42 m of seats may pass the frame
      expect(smallestMargin(boxInFrame(views[name], STAGE, frame)), name).toBeGreaterThan(0.0599);
      const at = boxInFrame(views[name], HOUSE, frame);
      expect(Math.max(at.width, at.height), name).toBeGreaterThan(0.6);
    }
    for (const name of ['front', 'side'] as const) {
      const at = boxInFrame(views[name], STAGE, frame);
      expect(Math.max(at.width, at.height), name).toBeGreaterThan(0.85);
    }
  });

  it('lets the camera zoom out to the whole file', () => {
    const v = cameraViews();
    v.fitTo(FILE, fitter);
    v.setView('top', true);
    const diagonal = Math.hypot(190, 28, 100);
    expect(v.controls.maxDistance).toBeGreaterThan(5 * diagonal);
    expect(v.table.house).toEqual(HOUSE);
    expect(v.table.outliers).toBe(8);
  });

  it('takes the FOH depth from fixtures in front of the stage, not from a tower to one side', () => {
    const tower: Vec3 = [80, 14, 60];
    expect(fohDepth(STAGE, HOUSE, [tower])).toBe(fohDepth(STAGE, HOUSE, []));
    expect(fohDepth(STAGE, HOUSE, [tower, [3, 3, 40]])).toBe(45);
  });
});
