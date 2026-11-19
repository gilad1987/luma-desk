import type { Vec3Tuple } from '../../core';
import { boxCentre, boxCorners, fitDistance, fitFov, sub } from '../camera/boxFit';
import { freeTangents, type ViewFrame } from '../camera/viewFrame';
import type { CameraView } from '../camera/viewTable';
import type { StagePlace } from './StagePlace';
import { floorOf } from './stageViews';

/** Eye height of a standing person (m). */
const EYE = 1.7;
/** The lens of the On Stage view (degrees): a person's wide look, which holds the house and the rig overhead. */
const STAGE_FOV = 65;
/** The lens limits of the look at a screen cluster (degrees), as for a person in the house (`crowdView`). */
const LENS = { min: 46, max: 75 } as const;
/** The eye that stands in the middle of the rig looks at a point this far ahead (m): the orbit turns about it. */
const AHEAD_M = 12;

/** The direction in plan from the stage to its house: toward the middle of its seats, else downstage (+z). */
function houseSide({ stage, seats }: StagePlace): readonly [x: number, z: number] {
  if (!seats) return [0, 1];
  const [from, to] = [boxCentre(stage), boxCentre(seats)];
  const [x, z] = [to[0] - from[0], to[2] - from[2]];
  const length = Math.hypot(x, z);
  return length > 1 ? [x / length, z / length] : [0, 1];
}

/**
 * The look at the screens of a file without fixtures: a person on the ground in front of them, on the house side,
 * at the distance from which the On Stage lens holds the screen cluster; the lens then fits it from the low eye. A
 * look out from such a "stage" shows an empty house, which is a black frame.
 */
function screenFront(place: StagePlace, frame: ViewFrame): CameraView {
  const { stage } = place;
  const target = boxCentre(stage);
  const [x, z] = houseSide(place);
  const corners = boxCorners(stage);
  const level = { corners, centre: target, dir: [-x, 0, -z] as const };
  const distance = Math.max(fitDistance(level, freeTangents(STAGE_FOV, frame)), 2 * EYE);
  const position: Vec3Tuple = [target[0] + x * distance, stage.min[1] + EYE, target[2] + z * distance];
  const dir = sub(target, position);
  const fov = fitFov({ corners, centre: target, dir }, Math.hypot(...dir), frame);
  return { position, target, fov: Math.min(LENS.max, Math.max(LENS.min, fov)) };
}

/** A person in the middle of the rig's footprint, on the floor, looking level toward the house. */
function fromCentre(place: StagePlace, floor: number): CameraView {
  const centre = boxCentre(place.stage);
  const [x, z] = houseSide(place);
  const y = floor + EYE;
  return {
    position: [centre[0], y, centre[2]],
    target: [centre[0] + x * AHEAD_M, y, centre[2] + z * AHEAD_M],
    fov: STAGE_FOV,
  };
}

/**
 * The On Stage view of any file. A stage with its deck in the stage box and drawn seats keeps the `usual` view
 * (`stageViews`: a performer upstage centre, looking into the house). Without that deck or without seats there is
 * no upstage centre to stand on and no house to look into: the eye then stands in the middle of the footprint of
 * the rig, on the lowest floor there, and looks to the house side (`houseSide`), with the rig around and over it. A
 * file without fixtures has screens for a stage, and the view looks at their front (`screenFront`).
 */
export function onStageView(place: StagePlace, usual: CameraView, frame: ViewFrame): CameraView {
  if (place.isScreensOnly) return screenFront(place, frame);
  const { deck } = place;
  const floor = floorOf(place);
  // `floorOf` gives the deck only when it lies in the stage box; its fallback is the box floor
  const isOnDeck = deck !== undefined && floor.upstage === deck.z0 && floor.downstage === deck.z1;
  return isOnDeck && place.seats ? usual : fromCentre(place, floor.top);
}
