import type { StageBounds, Vec3 } from '../../domain/stage/types';
import { boxShare } from '../camera/boxShare';
import type { ViewFrame } from '../camera/viewFrame';
import type { CameraView } from '../camera/viewTable';

/**
 * The least the stage takes of the free rectangle in the two views that also show the house. Overview: this share
 * of the width, or of the height when the height binds (a tall rig in a wide window). Plan: this share of the
 * shorter side, for the longer side of the stage.
 */
export const STAGE_SHARE = { width: 0.4, height: 0.55, plan: 0.4 } as const;

/** Halvings of the search between the house box and the stage box: the result is exact to a millionth of the way. */
const STEPS = 24;

/** A view and the box it holds in frame. */
export interface Framed {
  readonly view: CameraView;
  readonly box: StageBounds;
}

const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** The box `t` of the way from `house` to `rig`: every side moves toward the stage, the far sides the most. */
const between = (house: StageBounds, rig: StageBounds, t: number): StageBounds => ({
  min: mix(house.min, rig.min, t),
  max: mix(house.max, rig.max, t),
});

/**
 * The view of the house in which the stage comes first. The house box (the stage and its own seats) is framed whole
 * when the stage is then large `enough`. A deep house, or a site with seats far to the sides, showed the stage as a
 * sixth of the frame; then the framed box shrinks toward the stage box, only as far as needed, so the far part of
 * the house leaves the frame and the rows next to the stage stay. The stage box alone always passes: it fills the
 * free rectangle on its binding side.
 */
export function stageFirst(
  house: StageBounds,
  rig: StageBounds,
  view: (box: StageBounds) => CameraView,
  enough: (view: CameraView) => boolean,
): Framed {
  const whole = view(house);
  if (enough(whole)) return { view: whole, box: house };
  let [low, high] = [0, 1];
  for (let step = 0; step < STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (enough(view(between(house, rig, middle)))) high = middle;
    else low = middle;
  }
  const box = between(house, rig, high);
  return { view: view(box), box };
}

/** The rule of the overview: the stage spans `STAGE_SHARE.width` of the free width, or `height` of the free height. */
export const wideEnough =
  (rig: StageBounds, frame: ViewFrame) =>
  (view: CameraView): boolean => {
    const share = boxShare(view, rig, frame);
    return share.width >= STAGE_SHARE.width || share.height >= STAGE_SHARE.height;
  };

/** The rule of the plan: the longer side of the stage spans `STAGE_SHARE.plan` of the shorter side of the frame. */
export const planEnough =
  (rig: StageBounds, frame: ViewFrame) =>
  (view: CameraView): boolean => {
    const share = boxShare(view, rig, frame);
    const longer = Math.max(share.width * frame.free.width, share.height * frame.free.height);
    return longer >= STAGE_SHARE.plan * Math.min(frame.free.width, frame.free.height);
  };
