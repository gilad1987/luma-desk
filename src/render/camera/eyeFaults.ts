import type { Vec3Tuple } from '../../core';
import type { StageBounds } from '../../domain/stage/types';
import { boxCentre, boxCorners, cross, dot, sub, unit } from './boxFit';
import { entry, holds, isApart, longestSide } from './boxRay';
import { DEFAULT_LENS } from './boxShare';
import { freeTangents, type ViewFrame } from './viewFrame';
import type { CameraView } from './viewTable';

/**
 * What stands around an eye: the boxes of the drawn objects that may block it, and for a view from outside the stage
 * the box it looks at (`stageZone`). A view that looks out from the stage has no `stage`.
 */
export interface EyeZone {
  readonly obstacles: readonly StageBounds[];
  readonly stage?: StageBounds;
}

/** No object is nearer to the eye than this in plan (m), or than `HEADROOM` above or below it. */
const CLEAR = 1.5;
const HEADROOM = 0.25;
/** A view that looks out has nothing on its sight rays nearer than this (m). */
const SIGHT = 3;
/** A box that holds the eye and is wider and deeper than this (m) is a space the eye stands in, not a block. */
const ROOM = 8;
/** An object in front of the stage is large in the frame when it spans this share of the free height. */
const LARGE = 0.12;
/** An object that ends this far below the eye (m) is under the view, as the seats around a standing person. */
const LOW = 0.5;
/** Objects this near the stage box (m) are parts of the stage: they hide nothing of it. */
const TOUCH = 1;
/** Where the sight rays of a view that looks out pass the frame: half widths and half heights from its centre. */
const LOOKS: readonly (readonly [number, number])[] = [
  [0, 0],
  [-0.5, 0],
  [0.5, 0],
  [-0.9, 0],
  [0.9, 0],
  [0, 0.5],
];
/** The weights of the faults: the eye in an object, a blocked sight ray, a large object in front of the stage. */
const WEIGHT = { inside: 1000, blocked: 100, large: 10 } as const;

/** A sight ray: its unit direction, and how far along it an object is in the way (m). */
interface Ray {
  readonly dir: Vec3Tuple;
  readonly reach: number;
}

/** The zone of a view from outside `stage`: the obstacles without the parts of the stage and the spaces around it. */
export function stageZone(obstacles: readonly StageBounds[], stage: StageBounds): EyeZone {
  const centre = boxCentre(stage);
  return { stage, obstacles: obstacles.filter((box) => isApart(box, stage, TOUCH) && !holds(box, centre)) };
}

/** The sight rays to the stage: to its centre and to the corners of its inner half, each as far as the stage box. */
function stageRays(eye: Vec3Tuple, stage: StageBounds): Ray[] {
  const c = boxCentre(stage);
  const inner = boxCorners(stage).map((p): Vec3Tuple => [(p[0] + c[0]) / 2, (p[1] + c[1]) / 2, (p[2] + c[2]) / 2]);
  return [c, ...inner].map((point) => {
    const dir = unit(sub(point, eye));
    const reach = entry(eye, dir, stage);
    return { dir, reach: Number.isFinite(reach) ? reach : 0 };
  });
}

/**
 * How badly objects stand in the way of the eye of `view`: 0 for a clear eye. The eye is in or against an object
 * (`CLEAR`); an object lies on a sight ray, before the stage or within `SIGHT` of an eye that looks out; or an
 * object in front of the stage is `LARGE` in the frame at eye height (a fixture body or a screen close at a wing).
 */
export function eyeFaults(view: CameraView, frame: ViewFrame, { obstacles, stage }: EyeZone): number {
  const eye = view.position;
  const ahead = unit(sub(view.target, eye));
  const right = unit(cross(ahead, [0, 1, 0]));
  const up = cross(right, ahead);
  const tan = freeTangents(view.fov ?? DEFAULT_LENS, frame);
  const look = ([u, v]: readonly [number, number]): Ray => {
    const [h, w] = [u * tan.h, v * tan.v];
    const through = (a: 0 | 1 | 2): number => ahead[a] + right[a] * h + up[a] * w;
    return { dir: unit([through(0), through(1), through(2)]), reach: SIGHT };
  };
  const rays = stage ? stageRays(eye, stage) : LOOKS.map(look);
  const front = stage ? Math.min(...boxCorners(stage).map((corner) => dot(sub(corner, eye), ahead))) : 0;
  let faults = 0;
  for (const box of obstacles) {
    if (holds(box, eye, CLEAR, HEADROOM)) {
      const isRoom = holds(box, eye) && box.max[0] - box.min[0] > ROOM && box.max[2] - box.min[2] > ROOM;
      faults += isRoom ? 0 : WEIGHT.inside;
      continue;
    }
    faults += WEIGHT.blocked * rays.filter(({ dir, reach }) => entry(eye, dir, box) < reach).length;
    const p = sub(boxCentre(box), eye);
    const depth = dot(p, ahead);
    const isSeen = Math.abs(dot(p, right)) < depth * tan.h && Math.abs(dot(p, up)) < depth * tan.v;
    const isLarge = longestSide(box) > LARGE * 2 * tan.v * depth && box.max[1] > eye[1] - LOW;
    if (depth > 0 && depth < front && isSeen && isLarge) faults += WEIGHT.large;
  }
  return faults;
}
