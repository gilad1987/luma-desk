import type { StageBounds } from '../../domain/stage/types';
import { boxCorners, cross, dot, sub, unit } from './boxFit';
import { freeTangents, type ViewFrame } from './viewFrame';
import type { CameraView } from './viewTable';

/** The lens of a view that names none (degrees): the camera's own default. */
export const DEFAULT_LENS = 46;

/** How much of the free rectangle a box spans, across and upward: 1 is the full width or height. */
export interface FrameShare {
  readonly width: number;
  readonly height: number;
}

/**
 * The share of the free rectangle of `frame` that `box` spans, seen through `view`: the rectangle around its eight
 * projected corners. The renderer puts the sight line on the centre of the free rectangle, so the share follows from
 * the view alone. A corner at or behind the eye counts as far outside the frame: the box is then larger than it.
 */
export function boxShare(view: CameraView, box: StageBounds, frame: ViewFrame): FrameShare {
  const ahead = unit(sub(view.target, view.position));
  // The orbit controls keep the world y axis up, so the screen axes follow from the view direction alone.
  const right = unit(cross(ahead, [0, 1, 0]));
  const up = cross(right, ahead);
  const tan = freeTangents(view.fov ?? DEFAULT_LENS, frame);
  const seen = boxCorners(box).map((corner) => {
    const p = sub(corner, view.position);
    const depth = Math.max(dot(p, ahead), 1e-6);
    return [dot(p, right) / (depth * tan.h), dot(p, up) / (depth * tan.v)] as const;
  });
  const span = (axis: 0 | 1): number => {
    const values = seen.map((point) => point[axis]);
    return (Math.max(...values) - Math.min(...values)) / 2;
  };
  return { width: span(0), height: span(1) };
}
