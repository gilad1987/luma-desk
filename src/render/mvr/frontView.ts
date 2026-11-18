import type { StageBounds } from '../../domain/stage/types';
import type { CameraView } from '../camera/viewTable';
import { FRAME_ASPECT, fovOf, tanHalfH, tanHalfV } from './lens';

/** How one view from the audience frames the stage box. */
export interface FrontFrame {
  /** The view's own lens (degrees, vertical); a far FOH position may narrow it. */
  readonly fov: number;
  /** The fraction of the frame width the box front fills. */
  readonly fill: number;
  /** How far above the frame centre the box centre sits, as a fraction of the frame height (the MA console). */
  readonly lift: number;
  /** The world z of the farthest front-of-house fixture the eye must stand behind, if any. */
  readonly behind?: number;
}

/** The look-at point's height in the box: 40% up, so a tall roof does not push the deck to the frame bottom. */
const AIM_HEIGHT = 0.4;
/** The eye's rise per metre of distance: a slight look down, as from a FOH riser. */
const EYE_RISE = 0.08;
/** The largest fraction of the free frame height the box may take. */
const HEIGHT_FILL = 0.9;
/** How far (metres) the eye stands behind the farthest FOH fixture, so those fixtures stay small, low in frame. */
const BEHIND_M = 5;

/**
 * A view from the audience on the box's centre line (FOH, the MA FOH, front): the distance makes the box front fill
 * `fill` of a 16:9 frame width and keeps its height in the free part of the frame. The file's own FOH fixtures stand
 * out front; when they are farther out than that distance, the eye stands `BEHIND_M` behind them and the lens narrows
 * so the box still fills `fill`, so no fixture comes between the eye and the stage at a large size.
 */
export function frontView(box: StageBounds, frame: FrontFrame): CameraView {
  const { min, max } = box;
  const width = max[0] - min[0];
  const height = max[1] - min[1];
  const heightFill = HEIGHT_FILL * (1 - 2 * frame.lift);
  const free = Math.max(
    width / (2 * frame.fill * tanHalfH(frame.fov)),
    height / (2 * heightFill * tanHalfV(frame.fov)),
  );
  const far = frame.behind === undefined ? 0 : frame.behind + BEHIND_M - max[2];
  const distance = Math.max(free, far);
  const tangent = Math.max(width / (2 * frame.fill * distance * FRAME_ASPECT), height / (2 * heightFill * distance));
  const fov = distance > free ? fovOf(tangent) : frame.fov;
  const x = (min[0] + max[0]) / 2;
  const z = (min[2] + max[2]) / 2;
  const eyeZ = max[2] + distance;
  const aimY = min[1] + AIM_HEIGHT * height;
  const lowered = aimY - 2 * frame.lift * tanHalfV(fov) * (eyeZ - z);
  return { position: [x, aimY + EYE_RISE * (eyeZ - z), eyeZ], target: [x, lowered, z], fov };
}
