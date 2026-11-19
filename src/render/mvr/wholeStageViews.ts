import type { Vec3Tuple } from '../../core';
import type { StageBounds } from '../../domain/stage/types';
import { boxCentre, boxCorners, eyeAt, fitDistance, fitFov } from '../camera/boxFit';
import { centredView } from '../camera/centredFit';
import { freeTangents, type ViewFrame } from '../camera/viewFrame';
import type { CameraView } from '../camera/viewTable';
import { DEFAULT_FOV } from './lens';
import { planEnough, stageFirst, wideEnough, type Framed } from './stageFirst';

/** The lens of the elevations and the plan (degrees): long, so the near and the far side of the rig differ little. */
const LONG_LENS = 25;
/** The limits of the FOH zoom lens (degrees): below, the picture goes flat; above, the frame edges stretch. */
const FOH_LENS = { min: 20, max: 60 } as const;
/** Eye height of a standing person (m). */
const EYE = 1.7;
/** The FOH eye's rise per metre of distance from the rig centre: a slight look down, so the deck surface shows. */
const FOH_RISE = 0.05;
/** How far (m) the FOH eye stands behind the farthest front-of-house fixture, so none hangs large in the frame. */
const BEHIND_M = 5;
/** Where the FOH eye stands in a house without front-of-house fixtures, as a share of the house depth. */
const HOUSE_SHARE = 0.65;
/** The house is taken to be at least this deep (m) when the file draws no seats. */
const MIN_HOUSE = 30;
/** The plan view leans this far upstage (radians): straight down has no "up" for the orbit controls. */
const TOP_LEAN = 0.002;
/** The overview stands this far round from the centre line, to audience left, and this high (degrees). */
const WIDE = { azimuth: 37, elevation: 32 } as const;

const rad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * The view along `dir` on the centre of `box`, from the distance at which the whole box lies in the free rectangle
 * of `frame` with the fit margin (`fitDistance`: all eight corners against both fields of view). The box centre is
 * the look-at point, and the renderer puts that on the centre of the free rectangle, so the orbit turns about it.
 */
export function fitView(box: StageBounds, dir: Vec3Tuple, fov: number, frame: ViewFrame): CameraView {
  const target = boxCentre(box);
  const distance = fitDistance({ corners: boxCorners(box), centre: target, dir }, freeTangents(fov, frame));
  return { position: eyeAt(target, dir, distance), target, fov };
}

/**
 * A drawing view (elevation, plan): the long lens from wherever it holds the box, also for a site 190 m wide. No
 * distance is special: a black picture from 270 m was a model with NaN normals (`repairNormals`), not the distance.
 */
const drawingView = (box: StageBounds, dir: Vec3Tuple, frame: ViewFrame): CameraView =>
  fitView(box, dir, LONG_LENS, frame);

/** The front elevation: level on the centre line at half the rig height, in perspective with the long lens. */
export const frontView = (rig: StageBounds, frame: ViewFrame): CameraView => drawingView(rig, [0, 0, -1], frame);

/** The side elevation from stage left (+x, house right): level, the rig depth across the frame. */
export const sideView = (rig: StageBounds, frame: ViewFrame): CameraView => drawingView(rig, [-1, 0, 0], frame);

/**
 * The plan: down on the stage and its seats, upstage at the top; the long lens keeps the towers from splaying out.
 * The stage comes first (`stageFirst`): a deep house is cut at the far rows.
 */
export const topView = (house: StageBounds, rig: StageBounds, frame: ViewFrame): Framed =>
  stageFirst(house, rig, (box) => drawingView(box, [0, -1, -TOP_LEAN], frame), planEnough(rig, frame));

/**
 * The overview: a raised three-quarter view from audience left, the stage and as much of its seats as leaves the
 * stage large in the middle of the frame (`stageFirst`).
 */
export function wideView(house: StageBounds, rig: StageBounds, frame: ViewFrame): Framed {
  const [az, el] = [rad(WIDE.azimuth), rad(WIDE.elevation)];
  const dir: Vec3Tuple = [Math.sin(az) * Math.cos(el), -Math.sin(el), -Math.cos(az) * Math.cos(el)];
  return stageFirst(house, rig, (box) => centredView(box, dir, DEFAULT_FOV, frame), wideEnough(rig, frame));
}

/**
 * The world z of the FOH position: `BEHIND_M` behind the farthest fixture in front of the rig box within its width
 * (follow spots show where FOH is; a tower to one side does not), else `HOUSE_SHARE` through the seats behind the rig.
 */
export function fohDepth(rig: StageBounds, scene: StageBounds, fixtures: readonly Vec3Tuple[]): number {
  const front = fixtures.filter(([x, , z]) => z > rig.max[2] && x >= rig.min[0] && x <= rig.max[0]).map((p) => p[2]);
  if (front.length > 0) return Math.max(...front) + BEHIND_M;
  return rig.max[2] + HOUSE_SHARE * Math.max(scene.max[2] - rig.max[2], MIN_HOUSE);
}

/**
 * The view from front of house: on the centre line at `depth`, looking at the rig centre. The eye is a standing
 * person's, but never below the rig centre: the orbit controls hold the eye at or above its target, and a look up
 * would make the towers lean. From that place the lens zooms until the rig fills the free rectangle (`fitFov`), so
 * the perspective is the one of the FOH position; only past the lens limits does the eye move along its sight line.
 */
export function fohView(rig: StageBounds, depth: number, frame: ViewFrame): CameraView {
  const target = boxCentre(rig);
  const run = Math.max(depth - target[2], 1);
  const rise = Math.max(0, rig.min[1] + EYE - target[1]) + FOH_RISE * run;
  const dir: Vec3Tuple = [0, -rise, -run];
  const sight = { corners: boxCorners(rig), centre: target, dir };
  const lens = fitFov(sight, Math.hypot(run, rise), frame);
  const fov = Math.min(FOH_LENS.max, Math.max(FOH_LENS.min, lens));
  const distance = fitDistance(sight, freeTangents(fov, frame));
  return { position: eyeAt(target, dir, distance), target, fov };
}
