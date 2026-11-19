import type { StageBounds, Vec3 } from '../../domain/stage/types';
import { BACKDROP_CLEAR, upstageCentre, type Floor } from './stageViews';

/** Eye height of a standing person over the floor (m): a part that does not reach it blocks no view. */
const EYE = 1.7;
/** A proxy panel counts when its centre is this near the centre line and the eye height (m). */
const NEAR_M = 1.5;
/** Half the width of the sight window on the centre line (m): what a person sees straight ahead. */
const WINDOW_M = 1;
/** The parts ahead block the view when they cover this share of the window width; a person or a stand does not. */
const COVER = 0.75;
/** A part this near in front of the eye (m) fills the frame, so the eye steps past it. */
const SIGHT_M = 3;

/** A part at eye height in the sight window: the width it covers there, its upstage side and its house side. */
interface Part {
  readonly from: number;
  readonly to: number;
  readonly back: number;
  readonly face: number;
}

/**
 * The part of a placed mesh in the sight window, or none. A wall of panels is many meshes with seams, so no single
 * box has to cross the centre line. A mesh deeper than half the floor is the deck, a roof or the hall: the eye
 * stands in it, not behind it. A part the eye cannot pass and still stand on the floor is not passed.
 */
function boxPart({ min, max }: StageBounds, floor: Floor): Part[] {
  const eye = floor.top + EYE;
  const from = Math.max(min[0], floor.x - WINDOW_M);
  const to = Math.min(max[0], floor.x + WINDOW_M);
  const onFloor = max[2] >= floor.upstage && max[2] + BACKDROP_CLEAR <= floor.downstage;
  const shallow = max[2] - min[2] <= (floor.downstage - floor.upstage) / 2;
  return to > from && min[1] <= eye && max[1] >= eye && onFloor && shallow
    ? [{ from, to, back: min[2], face: max[2] }]
    : [];
}

/** A drawn proxy panel has no mesh: its centre near the centre line at eye height stands for the whole window. */
function pointPart([x, y, z]: Vec3, floor: Floor): Part[] {
  const near = Math.abs(x - floor.x) <= NEAR_M && Math.abs(y - (floor.top + EYE)) <= NEAR_M;
  const onFloor = z >= floor.upstage && z + BACKDROP_CLEAR <= floor.downstage;
  return near && onFloor ? [{ from: floor.x - WINDOW_M, to: floor.x + WINDOW_M, back: z, face: z }] : [];
}

/** The width of the sight window that `parts` cover together (m). */
function covered(parts: readonly Part[]): number {
  let end = -Infinity;
  let width = 0;
  for (const { from, to } of [...parts].sort((a, b) => a.from - b.from)) {
    if (to <= end) continue;
    width += to - Math.max(from, end);
    end = to;
  }
  return width;
}

/**
 * The house side of the last parts the eye at `stand` must pass (`face` so far): every wall in the upstage half,
 * and whatever stands within `SIGHT_M` in front of the eye. Each step moves the eye past at least one part.
 */
function pass(parts: readonly Part[], floor: Floor, stand: number, face?: number): number | undefined {
  const middle = (floor.upstage + floor.downstage) / 2;
  const ahead = parts.filter(
    (part) => part.face + BACKDROP_CLEAR > stand && (part.face <= middle || part.back <= stand + SIGHT_M),
  );
  if (covered(ahead) < COVER * 2 * WINDOW_M) return face;
  const next = Math.max(...ahead.map((part) => part.face));
  return pass(parts, floor, next + BACKDROP_CLEAR, next);
}

/**
 * The world z of the house side of what the On Stage eye must stand in front of, or undefined when nothing blocks
 * the view from upstage centre (`upstageCentre`). A quarter of the floor depth in from the back edge is behind the
 * upstage screen of many stages, and the view was then a screen that fills the frame. The eye passes every wall,
 * screen or drape of the upstage half that fills the sight window at eye height, and then each large part that
 * stands within `SIGHT_M` in front of it (a high riser, a set piece); a low riser blocks nothing. `boxes` are the
 * placed meshes and `points` the centres of the drawn proxy panels, which have no mesh.
 */
export function stageBackdrop(
  boxes: readonly StageBounds[],
  points: readonly Vec3[],
  floor: Floor,
): number | undefined {
  const parts = [...boxes.flatMap((box) => boxPart(box, floor)), ...points.flatMap((point) => pointPart(point, floor))];
  return pass(parts, floor, upstageCentre(floor));
}
