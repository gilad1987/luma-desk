import type { StageBounds, Vec3 } from '../../domain/stage/types';
import { clearEye } from '../camera/clearEye';
import { stageZone, type EyeZone } from '../camera/eyeFaults';
import type { ViewFitter, ViewFrame } from '../camera/viewFrame';
import type { CameraView, ViewTable } from '../camera/viewTable';
import { crowdView } from './crowdView';
import { onStageView } from './onStageView';
import { withPoints } from './proxyPoints';
import { stageViews, type StagePlace } from './stageViews';
import { fohDepth, fohView, frontView, sideView, topView, wideView } from './wholeStageViews';

/** An imported stage frames every named view itself; none keeps a scaled position of `fitViews`. */
export type MvrViewTable = ViewTable;

/**
 * The views of an imported stage, for any frame. `fitViews` scales the hand-placed built-in views about one anchor,
 * which cannot fill the frame for a small stage, cuts a tall rig in a wide window and knows nothing of the MA console;
 * these views are fitted to the frame instead (`wholeStageViews`), so the camera asks for them again whenever the
 * window or the layout changes (`ViewFitter`). It holds data only, so two fits of the same stage compare equal.
 * - FOH, Front and Side hold the rig box (`place.stage`: the stage without the hall and the seats) in frame.
 * - Wide and Top hold the house box (`house`: the rig and the seat area) in frame while the stage stays large; a deep
 *   or wide house is cut at its far rows, the stage never (`stageFirst`).
 * - On Stage (`onStageView`), Band and Audience stand on or next to the deck (`stageViews`).
 * - Crowd stands in the front rows and opens its lens until the rig height is in frame (`crowdView`).
 * The eye of each of the seven whole-stage views gets a clear zone (`clearEye`): it is in no drawn object, and none
 * stands between it and the stage (`place.obstacles`).
 * The scene box (`scene`: every shown part of the file) is framed by no button: a wide file would show its stage as
 * a small part of the frame. It sets the zoom-out limit, so the user reaches the whole file with the wheel.
 * The demo venue's own places do not exist on an imported stage, so their buttons fall back: Drums and Orchestra
 * frame the band, Ring stands on the stage, Walls and Old City give the overview. FOH in the MA layout is the same
 * FOH view: the renderer already centres the picture in the area above the console.
 */
export class MvrViews implements ViewFitter {
  readonly rig: StageBounds;
  readonly scene: StageBounds;
  readonly house: StageBounds;
  readonly outliers: number;
  /** The drawn seats and panels that stand far from the house box and are in no framed view (`seatCluster`). */
  readonly farProxies: number;
  private readonly place: StagePlace;
  private readonly depth: number;
  /** What may block an eye that stands on the stage or in the house, and one that looks at the stage from outside. */
  private readonly near: EyeZone;
  private readonly far: EyeZone;

  constructor(box: StageBounds, fixtures: readonly Vec3[], place: StagePlace) {
    this.rig = place.stage;
    this.scene = box;
    this.house = place.seats ? withPoints(place.stage, [place.seats.min, place.seats.max]) : place.stage;
    this.outliers = place.outliers ?? 0;
    this.farProxies = place.farProxies ?? 0;
    this.place = place;
    this.depth = fohDepth(place.stage, this.house, fixtures);
    this.near = { obstacles: place.obstacles ?? [] };
    this.far = stageZone(this.near.obstacles, place.stage);
  }

  tableFor(frame: ViewFrame): MvrViewTable {
    const out = (view: CameraView): CameraView => clearEye(view, frame, this.near);
    const at = (view: CameraView, hold: StageBounds): CameraView => clearEye(view, frame, this.far, hold);
    const onStage = stageViews(this.place, this.house);
    const stage = out(onStageView(this.place, onStage.stage, frame));
    const foh = at(fohView(this.rig, this.depth, frame), this.rig);
    const [overview, plan] = [wideView(this.house, this.rig, frame), topView(this.house, this.rig, frame)];
    const wide = at(overview.view, overview.box);
    return {
      ...onStage,
      stage,
      crowd: out(crowdView(this.place, frame)),
      drums: onStage.band,
      orch: onStage.band,
      ring: stage,
      walls: wide,
      valley: wide,
      foh,
      fohMa: foh,
      front: at(frontView(this.rig, frame), this.rig),
      wide,
      top: at(plan.view, plan.box),
      side: at(sideView(this.rig, frame), this.rig),
    };
  }
}

/**
 * The frame-fitted views of an imported stage from its scene box, its fixture positions and its performance place
 * (`mvrStagePlace`); without a place the scene box stands in for the rig box.
 */
export function mvrViews(box: StageBounds, fixtures: readonly Vec3[], place: StagePlace = { stage: box }): MvrViews {
  return new MvrViews(box, fixtures, place);
}
