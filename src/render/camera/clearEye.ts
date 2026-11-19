import type { Vec3Tuple } from '../../core';
import type { StageBounds } from '../../domain/stage/types';
import { boxCorners, fitFov, sub } from './boxFit';
import { eyeFaults, type EyeZone } from './eyeFaults';
import type { ViewFrame } from './viewFrame';
import type { CameraView } from './viewTable';

/** The eye distances that are tried, as shares of the view's own: first toward the target, then away from it. */
const SCALES = [1, 0.85, 0.7, 0.55, 0.4, 1.25, 1.6, 2] as const;
/** After every distance at the view's own height, the same distances with the eye raised by these (m). */
const RISES = [0, 2, 4, 8] as const;
/** The lens a moved eye may need to hold its box (degrees): below, the picture is flat; above, the edges stretch. */
const LENS = { min: 10, max: 75 } as const;

/**
 * `view` with the eye at `scale` of its distance from the target and `rise` higher. With a box to `hold`, the lens
 * is the one that fits the box from there (`fitFov`), so the picture keeps its framing; undefined when no allowed
 * lens does. The view's own place is the view itself, so a clear eye changes nothing.
 */
function moved(
  view: CameraView,
  [scale, rise]: readonly [number, number],
  frame: ViewFrame,
  hold?: StageBounds,
): CameraView | undefined {
  if (scale === 1 && rise === 0) return view;
  const back = sub(view.position, view.target);
  const position: Vec3Tuple = [
    view.target[0] + back[0] * scale,
    view.target[1] + back[1] * scale + rise,
    view.target[2] + back[2] * scale,
  ];
  if (!hold) return { ...view, position };
  const dir = sub(view.target, position);
  const fov = fitFov({ corners: boxCorners(hold), centre: view.target, dir }, Math.hypot(...dir), frame);
  return fov >= LENS.min && fov <= LENS.max ? { position, target: view.target, fov } : undefined;
}

/**
 * `view` from an eye with a clear zone (`eyeFaults`). An eye in or against an object, or with an object between it
 * and the stage, moves along its own sight line, toward the target and then away from it, and after that upward,
 * always in the same order (`SCALES`, `RISES`): the first clear place is taken. The target stays, so the orbit turns
 * about the same point. When no place is clear, the one with the least faults is kept and its `faults` say so, for
 * the view-fit data of the test hook.
 */
export function clearEye(view: CameraView, frame: ViewFrame, zone: EyeZone, hold?: StageBounds): CameraView {
  if (zone.obstacles.length === 0) return view;
  let best = view;
  let least = Infinity;
  for (const rise of RISES) {
    for (const scale of SCALES) {
      const candidate = moved(view, [scale, rise], frame, hold);
      if (!candidate) continue;
      const faults = eyeFaults(candidate, frame, zone);
      if (faults === 0) return candidate;
      if (faults < least) [best, least] = [candidate, faults];
    }
  }
  return { ...best, faults: least };
}
