import type { Vec3Tuple } from '../../core';
import type { StageBounds } from '../../domain/stage/types';
import { boxCentre, boxCorners, cross, dot, eyeAt, sub, unit } from './boxFit';
import { FIT_MARGIN, freeTangents, type ViewFrame } from './viewFrame';
import type { CameraView } from './viewTable';

/** A corner as metres to one side of the box centre and metres ahead of it, seen along the sight line. */
type Seen = readonly [side: number, ahead: number];

/**
 * One screen axis of the fit. A corner `side` from the sight line and `ahead` of the centre is inside the frame edge
 * when `side - shift <= reach * (ahead + distance)`, and the same holds for the other edge with `-side`. The corner
 * that needs the most on each edge gives two lines; where they cross, both edges touch: that is the nearest eye for
 * this axis. From a `distance` the sight line may be `plus - reach * distance` to `reach * distance - minus` aside.
 */
function axisFit(corners: readonly Seen[], reach: number): { readonly distance: number; readonly shift: Shift } {
  const need = (sign: 1 | -1): number => Math.max(...corners.map(([side, ahead]) => sign * side - reach * ahead));
  const [plus, minus] = [need(1), need(-1)];
  return {
    distance: (plus + minus) / (2 * reach),
    shift: (distance) => centred(corners, distance, plus - reach * distance, reach * distance - minus),
  };
}

/** How far aside of the box centre the sight line passes, for an eye distance. */
type Shift = (distance: number) => number;

/**
 * The shift between `from` and `to` at which the box is as far from one frame edge as from the other, seen from
 * `distance`. The corners differ in depth, so this is not the middle of the two limits; the lean of the picture
 * falls as the sight line moves, and halving the range 40 times finds its zero to well under a millimetre.
 */
function centred(corners: readonly Seen[], distance: number, from: number, to: number): number {
  const lean = (shift: number): number => {
    const seen = corners.map(([side, ahead]) => (side - shift) / (ahead + distance));
    return Math.max(...seen) + Math.min(...seen);
  };
  let [low, high] = [from, to];
  for (let step = 0; step < 40; step += 1) {
    const middle = (low + high) / 2;
    if (lean(middle) > 0) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

/**
 * The view along `dir` from the nearest eye that holds `box` in the free rectangle of `frame` with the fit margin on
 * each side, the box in the middle of the frame. A view down at an angle sees the near corners of a box larger than the
 * far ones, so a sight line through the box centre (`fitDistance`) left a third of the frame empty on one side and
 * stood farther away than needed. Here the sight line moves off the centre, sideways and up, until both edges of
 * the tighter screen axis touch; the other axis is centred the same way. The look-at point stays in the plane of
 * the box centre, so the orbit still turns about the middle of the box.
 */
export function centredView(box: StageBounds, dir: Vec3Tuple, fov: number, frame: ViewFrame): CameraView {
  const centre = boxCentre(box);
  const ahead = unit(dir);
  // The orbit controls keep the world y axis up, so the screen axes follow from the view direction alone.
  const right = unit(cross(ahead, [0, 1, 0]));
  const up = cross(right, ahead);
  const tan = freeTangents(fov, frame);
  const fill = 1 - 2 * FIT_MARGIN;
  const offsets = boxCorners(box).map((corner) => sub(corner, centre));
  const across = axisFit(
    offsets.map((p): Seen => [dot(p, right), dot(p, ahead)]),
    tan.h * fill,
  );
  const upward = axisFit(
    offsets.map((p): Seen => [dot(p, up), dot(p, ahead)]),
    tan.v * fill,
  );
  const distance = Math.max(0, across.distance, upward.distance);
  const [x, y] = [across.shift(distance), upward.shift(distance)];
  const target: Vec3Tuple = [
    centre[0] + x * right[0] + y * up[0],
    centre[1] + x * right[1] + y * up[1],
    centre[2] + x * right[2] + y * up[2],
  ];
  return { position: eyeAt(target, dir, distance), target, fov };
}
