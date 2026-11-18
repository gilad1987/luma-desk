import type { Vec3Tuple } from '../../core';
import { boundsOf } from '../../domain/stage/bounds';
import { BUILT_IN_DESIGN } from '../../domain/stage/templates/sultansPool/builtInDesign';
import type { StageBounds } from '../../domain/stage/types';
import { VIEWS, type CameraView, type ViewName, type ViewTable } from './viewTable';

/** The stage the hand-placed `VIEWS` were framed for; every fit is relative to it. */
const REFERENCE = boundsOf(BUILT_IN_DESIGN);
/**
 * The smallest fit scale. A smaller stage is framed as if it were this size, because a closer eye cuts off the
 * near deck corners in the FOH view (the empty 12 x 8 m template would need about 0.15), and a stage with no width
 * or depth would collapse every eye onto its target.
 */
const MIN_SCALE = 0.25;
/**
 * How much farther a fitted eye stands than the bare size ratio asks. The built-in deck fills only part of its bounds
 * (the side trusses reach far past it), while a template deck nearly fills its own, so without this the festival deck
 * overflows a 4:3 FOH frame. The built-in bounds take no margin: their views must stay bit for bit.
 */
const FIT_MARGIN = 1.25;

/** Whether the bounds are exactly the built-in stage's, which keep the hand-placed views unchanged. */
function isReference({ min, max }: StageBounds): boolean {
  return [0, 1, 2].every((i) => min[i] === REFERENCE.min[i] && max[i] === REFERENCE.max[i]);
}

/** The point a fit scales about: the footprint centre in x/z, at the floor of the box. */
function anchorOf({ min, max }: StageBounds): Vec3Tuple {
  return [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];
}

/**
 * How much larger `bounds` is than the reference stage: the larger of the width and the depth ratio, times the fit
 * margin, at least `MIN_SCALE`; exactly 1 for the reference bounds.
 */
function scaleOf(bounds: StageBounds): number {
  if (isReference(bounds)) return 1;
  const { min, max } = bounds;
  const [refMin, refMax] = [REFERENCE.min, REFERENCE.max];
  const width = (max[0] - min[0]) / (refMax[0] - refMin[0]);
  const depth = (max[2] - min[2]) / (refMax[2] - refMin[2]);
  return Math.max(MIN_SCALE, FIT_MARGIN * Math.max(width, depth));
}

/**
 * The camera views fitted to a stage's bounds (G7). Every eye and target point `p` becomes
 * `anchor + (p - referenceAnchor) * scale`, where the anchor is the footprint centre at floor height and the scale is
 * the larger of the width and depth ratios to the built-in stage's bounds, times `FIT_MARGIN` (at least
 * `MIN_SCALE`). Each view so keeps its angle and lens and frames the new stage with some room around it. It is
 * computed as `p * scale + (anchor - referenceAnchor * scale)`; the built-in bounds give scale 1 and so offset 0, and
 * every view comes back bit for bit.
 */
export function fitViews(bounds: StageBounds): ViewTable {
  const scale = scaleOf(bounds);
  const [ax, ay, az] = anchorOf(bounds);
  const [rx, ry, rz] = anchorOf(REFERENCE);
  const offset: Vec3Tuple = [ax - rx * scale, ay - ry * scale, az - rz * scale];
  const move = (p: Vec3Tuple): Vec3Tuple => [
    p[0] * scale + offset[0],
    p[1] * scale + offset[1],
    p[2] * scale + offset[2],
  ];
  const fit = (view: CameraView): CameraView => ({ ...view, position: move(view.position), target: move(view.target) });
  const names = Object.keys(VIEWS) as ViewName[];
  return Object.fromEntries(names.map((name) => [name, fit(VIEWS[name])])) as ViewTable;
}
