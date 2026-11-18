import type { Vec3Tuple } from '../../core';
import { fitFov } from '../camera/boxFit';
import type { ViewFrame } from '../camera/viewFrame';
import type { CameraView } from '../camera/viewTable';
import { floorOf, type StagePlace } from './stageViews';

/** Eye height of a standing person (m): over the heads of the seated rows in front. */
const EYE = 1.7;
/** The lens limits of the crowd view (degrees): a person's view of the stage; above 75 the frame edges stretch. */
const LENS = { min: 46, max: 75 } as const;
/** The eye stands this share into the seat depth: the middle of the first third of the rows. */
const ROW_SHARE = 1 / 6;
/** Without seats the eye stands this far in front of the deck (m): the front of a standing crowd. */
const NO_SEATS_M = 8;
/** The eye is never nearer than this to the house side of the rig (m), so no front truss hangs behind the eye. */
const CLEAR_M = 6;
/** A rig too tall for the widest lens moves the eye back in steps of this size (m), at most `STEPS` times. */
const STEP_M = 0.5;
const STEPS = 200;

/** The world z of the eye and the height of the floor under it: in the front seat rows, else in front of the deck. */
function standing(place: StagePlace, downstage: number): { readonly z: number; readonly floor: number } {
  const seats = place.seats;
  const first = seats ? Math.max(seats.min[2], downstage) : downstage;
  const depth = seats ? seats.max[2] - first : 0;
  const clear = place.stage.max[2] + CLEAR_M;
  // the front rows are the lowest of a raked house, so the floor under them is the bottom of the seat box
  if (seats && depth > 0) return { z: Math.max(first + ROW_SHARE * depth, clear), floor: seats.min[1] };
  return { z: Math.max(downstage + NO_SEATS_M, clear), floor: place.stage.min[1] };
}

/**
 * The view from `eye` at the house side of the rig (the world z `face`, from the stage floor to the rig top): the
 * sight line halves the angle between the floor and the top, which needs the narrowest lens, and the target is where
 * that line passes the middle of the deck (`middle`), so the orbit turns about the band.
 */
function aimed(eye: Vec3Tuple, place: StagePlace, middle: number, frame: ViewFrame): CameraView {
  const { min, max } = place.stage;
  const reach = eye[2] - max[2];
  const up = (Math.atan((max[1] - eye[1]) / reach) + Math.atan((min[1] - eye[1]) / reach)) / 2;
  const run = eye[2] - middle;
  const target: Vec3Tuple = [eye[0], eye[1] + Math.tan(up) * run, middle];
  // in real rows the width of a wide rig may pass the frame; an eye without rows stands where the whole rig shows
  const across = place.seats ? [eye[0]] : [min[0], max[0]];
  const corners = across.flatMap((x): Vec3Tuple[] => [
    [x, max[1], max[2]],
    [x, min[1], max[2]],
  ]);
  const sight = { corners, centre: target, dir: [0, target[1] - eye[1], -run] as const };
  return { position: eye, target, fov: fitFov(sight, Math.hypot(run, target[1] - eye[1]), frame) };
}

/**
 * The view of a person in the front rows, as on the built-in stage (`VIEWS.crowd`): from the house up at the stage,
 * with the full height of the rig in frame. The eye stands on the centre line of the deck at head height, in the
 * first third of the seat rows, or `NO_SEATS_M` in front of the deck without seats. The lens opens until the stage
 * floor and the rig top are in the free rectangle (the width of a wide rig may pass the frame, as it does for a
 * person in the front rows; a file without seats has no rows, and its eye holds the rig width in frame too). Only a
 * rig too tall, or without seats too wide, for the widest lens moves the eye back, at the same height: back
 * along the rising sight line would put it under the floor. The eye is below its target, which the orbit limit of an
 * imported stage allows down to the floor (`floorPolar`).
 */
export function crowdView(place: StagePlace, frame: ViewFrame): CameraView {
  const { x, upstage, downstage } = floorOf(place);
  const { z, floor } = standing(place, downstage);
  const middle = (upstage + downstage) / 2;
  const from = (step: number): CameraView => aimed([x, floor + EYE, z + step * STEP_M], place, middle, frame);
  const steps = Array.from({ length: STEPS }, (_, step) => step);
  const view = from(steps.find((step) => (from(step).fov ?? 0) <= LENS.max) ?? STEPS);
  return { ...view, fov: Math.min(LENS.max, Math.max(LENS.min, view.fov ?? LENS.min)) };
}
