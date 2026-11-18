import type { FigureSpec } from './FigureSpec';
import { MASK, type Corner, type Ring } from './loft';
import { SEATED } from './proportions';

/** Height of the proxy seat's back over its seat, metres: the back of a slumped figure touches its top edge. */
const BACK_OVER_SEAT = 0.4;
/** Where the spine meets the seat, metres in front of the seat back: half the depth of the hips. */
export const SPINE = 0.125;
/** The stature the level tables are written for. */
export const REFERENCE = 1.75;

/** One level of the trunk: height over the seat, half width, half depth, shift to the front; metres. */
type Level = readonly [height: number, halfWidth: number, halfDepth: number, forward: number];

/** The height of the shoulder joint over the seat for the reference stature: the acromion of `SEATED`, 0.586 m. */
export const SHOULDER = SEATED.shoulderHeight * REFERENCE;
/**
 * Seat, hips, waist, chest, shoulders (width from the spec) and collar. The shoulder ring lies just over the joint,
 * where the trapezius starts to rise to the neck; waist and chest are at the same shares of the back as before. The
 * hip ring is 0.175 wide as an ellipse and 0.184 as the eight-sided ring that is drawn: the hip breadth of `SEATED`.
 */
const TORSO: readonly Level[] = [
  [0, 0.155, 0.105, 0],
  [0.1, 0.175, 0.125, 0],
  [0.277, 0.15, 0.11, 0],
  [0.453, 0.165, 0.118, 0.005],
  [SHOULDER + 0.012, 0, 0.105, 0.012],
  [SHOULDER + 0.049, 0.09, 0.082, 0.016],
];
const SHOULDERS = 4;
/** The neck from the collar up into the head (the chin is 0.675 m over the seat), so no gap opens when it turns. */
const NECK: readonly Level[] = [
  [SHOULDER + 0.062, 0.066, 0.07, 0.02],
  [SHOULDER + 0.134, 0.05, 0.054, 0.034],
];
/** The neck stands in the shade of the chin. */
const NECK_SHADE = 0.82;

/** How far the hips slide forward: a slumped figure pivots on the top edge of the seat back, not through it. */
export const hipSlide = (spec: FigureSpec): number => Math.max(0, -spec.lean) * BACK_OVER_SEAT;

/**
 * The rings of torso and neck from the seat up. The rings stay level and only shift with the lean; the widened
 * shoulder ring and the collar give the slope from the arms to the neck. The spine of the rings that grow with the
 * build moves with it (`girth`), so the back of a slim body still touches the seat back and a heavy one does not pass
 * through it: the buttock-knee length is then the one of `SEATED` for every build.
 */
export function trunkRings(spec: FigureSpec): Ring[] {
  const k = spec.stature / REFERENCE;
  const ring = ([y, rx, rz, forward]: Level, corner: Corner, girth = 1): Ring => ({
    c: [0, y * k, -SPINE * girth - hipSlide(spec) - forward - spec.lean * y * k],
    u: [0, 0, -rz * girth],
    v: [-rx, 0, 0],
    surface: () => corner,
  });
  const torso = TORSO.map(([y, rx, rz, forward], i) => {
    const girth = i < SHOULDERS ? spec.build : 1;
    const width = i === SHOULDERS ? spec.shoulders / 2 - 0.04 : rx * girth;
    return ring([y, width, rz, forward], [MASK.top, 1], girth);
  });
  return [...torso, ...NECK.map((level) => ring(level, [MASK.skin, 1, NECK_SHADE]))];
}
