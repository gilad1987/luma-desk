/**
 * The rig box of a very wide file is its stage, not the box around every fixture: fixtures on sign boards and on a
 * tower far from the stage are outliers, counted and left out of the whole-stage views.
 */
import { describe, expect, it } from 'vitest';
import type { StageBounds, Vec3 } from '../../../../src/domain/stage/types';
import { rigCluster } from '../../../../src/render/mvr/rigCluster';

/** A 30 m x 18 m stage: 24 fixtures on four trusses 10 m up, and four floor fixtures. */
const STAGE: Vec3[] = [
  ...[-16, -11, -6, -1].flatMap((z) => [-15, -9, -3, 3, 9, 15].map((x): Vec3 => [x, 10, z])),
  ...[-12, -4, 4, 12].map((x): Vec3 => [x, 1.5, 1]),
];
/** Six fixtures on sign boards 80 m to one side and two on a tower 70 m in front. */
const FAR: Vec3[] = [...[0, 2, 4, 6, 8, 10].map((z): Vec3 => [95, 6, z]), [-2, 14, 72], [2, 14, 72]];
/** Everything the file shows: 190 m wide. */
const FILE: StageBounds = { min: [-95, 0, -20], max: [96, 30, 75] };
const TRUSS: StageBounds = { min: [-17, 9.5, -17], max: [17, 12, 0] };
const DECK: StageBounds = { min: [-16, 0, -18], max: [16, 1.5, 2] };
const GROUND: StageBounds = { min: [-95, -0.1, -20], max: [96, 0, 75] };
const BOARD: StageBounds = { min: [94, 0, -1], max: [96, 8, 11] };
const SCENERY = [TRUSS, DECK, GROUND, BOARD];

describe('rigCluster', () => {
  it('frames the stage of a wide file and counts the far fixtures', () => {
    const { box, outliers } = rigCluster([...STAGE, ...FAR], SCENERY, FILE);
    expect(outliers).toBe(8);
    // the fixtures, grown to the truss and the deck; the ground plane under all of it and the far board grow nothing.
    // The floor is the file's, the top is the truss: the 30 m tower is not over the stage.
    expect(box).toEqual({ min: [-17, 0, -18], max: [17, 12, 2] });
  });

  it('gives the same box for any order of the fixtures', () => {
    const forward = rigCluster([...STAGE, ...FAR], SCENERY, FILE);
    expect(rigCluster([...FAR, ...STAGE].reverse(), SCENERY, FILE)).toEqual(forward);
  });

  it('keeps both of two equal stages', () => {
    const second = STAGE.map(([x, y, z]): Vec3 => [x + 120, y, z]);
    const { box, outliers } = rigCluster([...STAGE, ...second], [], { min: [-20, 0, -20], max: [140, 12, 5] });
    expect(outliers).toBe(0);
    expect([box.min[0], box.max[0]]).toEqual([-15, 135]);
  });

  it('leaves a stage without far fixtures whole', () => {
    const { box, outliers } = rigCluster(STAGE, [], { min: [-20, 0, -20], max: [20, 12, 5] });
    expect(outliers).toBe(0);
    expect(box).toEqual({ min: [-15, 0, -16], max: [15, 10, 1] });
  });

  it('frames one fixture with the scenery that touches it, and the scene box when nothing does', () => {
    const piece: StageBounds = { min: [-3, 9.5, -6], max: [3, 10.5, -4] };
    expect(rigCluster([[0, 10, -5]], [piece, GROUND], FILE)).toEqual({
      box: { min: [-3, 0, -6], max: [3, 10.5, -4] },
      outliers: 0,
    });
    expect(rigCluster([[0, 10, -5]], [], FILE)).toEqual({ box: FILE, outliers: 0 });
  });

  it('falls back to the scene box without a fixture, and skips a fixture that is not finite', () => {
    expect(rigCluster([], SCENERY, FILE)).toEqual({ box: FILE, outliers: 0 });
    expect(rigCluster([[NaN, 0, 0]], SCENERY, FILE)).toEqual({ box: FILE, outliers: 0 });
  });
});
