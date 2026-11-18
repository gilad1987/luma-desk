import type { StageBounds, Vec3 } from '../../domain/stage/types';
import { VIEWS, type CameraView, type ViewTable } from '../camera/viewTable';
import { frontView } from './frontView';
import { DEFAULT_FOV, tanHalfH, tanHalfV } from './lens';
import { wideView } from './wideView';

/** The views an imported stage frames itself; the other named views keep the scaled positions of `fitViews`. */
export type MvrViewTable = Pick<ViewTable, 'foh' | 'fohMa' | 'front' | 'wide' | 'top' | 'side'>;

/** The fraction of the frame width the box front fills from FOH, as in the target audience view. */
const FOH_FILL = 0.75;
/** The front view stands closer than FOH: the box fills nearly the whole frame width. */
const FRONT_FILL = 0.95;
/** The fraction of the frame the box takes from the top and the side. */
const PLAN_FILL = 0.8;
/** In the MA layout the console overlay covers the lower third: the box centre sits a sixth of the frame higher. */
const MA_LIFT = 1 / 6;

/** The world z of the farthest fixture in front of the box (the FOH positions the stage box left out), if any. */
function farFront(box: StageBounds, fixtures: readonly Vec3[]): number | undefined {
  const out = fixtures.map((position) => position[2]).filter((z) => z > box.max[2]);
  return out.length === 0 ? undefined : Math.max(...out);
}

/** The distance at which a `span` x `rise` face fills `PLAN_FILL` of a 16:9 frame with the default lens. */
const planDistance = (span: number, rise: number): number =>
  Math.max(span / (2 * PLAN_FILL * tanHalfH(DEFAULT_FOV)), rise / (2 * PLAN_FILL * tanHalfV(DEFAULT_FOV)));

/** Straight down on the box; the target sits 0.1 m upstage of the eye, as in `VIEWS.top`, so the view has an up. */
function topView({ min, max }: StageBounds): CameraView {
  const [x, z] = [(min[0] + max[0]) / 2, (min[2] + max[2]) / 2];
  const y = max[1] + planDistance(max[0] - min[0], max[2] - min[2]);
  return { position: [x, y, z], target: [x, min[1], z - 0.1], fov: DEFAULT_FOV };
}

/** From stage right, level with 40% of the box height, the box depth across the frame. */
function sideView({ min, max }: StageBounds): CameraView {
  const [y, z] = [min[1] + 0.4 * (max[1] - min[1]), (min[2] + max[2]) / 2];
  const x = max[0] + planDistance(max[2] - min[2], max[1] - min[1]);
  return { position: [x, y, z], target: [(min[0] + max[0]) / 2, y, z], fov: DEFAULT_FOV };
}

/**
 * The framing views of an imported stage, from its stage box (`mvrCameraBounds`) and its fixtures. `fitViews` scales
 * the hand-placed built-in views about one anchor, which cannot fill the frame for a small stage nor stand the FOH
 * eye behind the file's own FOH positions; these views are plain frustum maths on the box instead (see `frontView`).
 */
export function mvrViews(box: StageBounds, fixtures: readonly Vec3[]): MvrViewTable {
  const behind = farFront(box, fixtures);
  const foh = { fill: FOH_FILL, ...(behind === undefined ? {} : { behind }) };
  return {
    foh: frontView(box, { ...foh, fov: DEFAULT_FOV, lift: 0 }),
    fohMa: frontView(box, { ...foh, fov: VIEWS.fohMa.fov, lift: MA_LIFT }),
    front: frontView(box, { fov: DEFAULT_FOV, fill: FRONT_FILL, lift: 0 }),
    wide: wideView(box),
    top: topView(box),
    side: sideView(box),
  };
}
