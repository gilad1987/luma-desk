import { clamp } from '../../core';
import type { Fixture } from '../../domain/Fixture';
import type { StageFrame } from '../../domain/stage/StageFrame';

/** A point in venue metres (x, y, z) that one fixture of the first look aims at. */
export type LookPoint = readonly [x: number, y: number, z: number];
/** The fixture fields the look plans read to place a fixture; tests pass plain objects. */
export type Placed = Pick<Fixture, 'id' | 'pos'>;

/**
 * The playing area the first look is composed on: the centre line (`cx`), the middle of the depth (`cz`), half the
 * width and depth in metres and the floor height the band stands on. The audience is on the +z side, as for every
 * built-in preset, so the downstage edge is `cz + halfDepth`.
 */
export interface LookArea {
  readonly cx: number;
  readonly cz: number;
  readonly halfWidth: number;
  readonly halfDepth: number;
  readonly floor: number;
}

/** A deck narrower or shallower than this is no deck: a broken box. */
const MIN_DECK_M = 0.5;
/** The smallest half size of an area made from the fixtures, so one fixture still has a place to aim at. */
const MIN_HALF_M = 2;
/** The share of the fixtures that must be over a deck (the import's own rule) and the metres around it that count. */
const MIN_OVER_DECK = 0.25;
const DECK_MARGIN_M = 2;
/**
 * A file without a deck gets the desk's stage rectangle on the ground (height 0). When that rectangle is narrower
 * than this share of the hung rig it is not the stage of this rig, and the look uses the area under the rig.
 */
const MIN_GROUND_SHARE = 0.4;
/** Metres above the ground from which a unit is hung; the hung units mark the area of a file without a deck. */
const HUNG_M = 2.5;
/** Under this spread in metres the units of a row are one position: nothing to spread or to fan. */
const MIN_SPREAD_M = 0.5;

/** The lowest and highest finite value, or 0 and 0 when there is none. */
function spanOf(values: readonly number[]): readonly [min: number, max: number] {
  const finite = values.filter(Number.isFinite);
  return finite.length === 0 ? [0, 0] : [Math.min(...finite), Math.max(...finite)];
}

/**
 * The area of a stage: its own deck when the rig hangs over it, else the box under the hung fixtures on a floor at
 * height 0, so a fixtures-only file still gets a centre line, a width and a depth of its own size. Never returns a
 * non-finite number.
 */
export function lookAreaOf(frame: Pick<StageFrame, 'deck'>, fixtures: readonly Placed[]): LookArea {
  const { x0, x1, z0, z1, height } = frame.deck;
  const [width, depth] = [Math.abs(x1 - x0), Math.abs(z1 - z0)];
  const hung = fixtures.filter((f) => f.pos.y >= HUNG_M);
  const [ax, bx] = spanOf((hung.length > 0 ? hung : fixtures).map((f) => f.pos.x));
  const [az, bz] = spanOf((hung.length > 0 ? hung : fixtures).map((f) => f.pos.z));
  const isOver = (f: Placed): boolean =>
    Math.abs(f.pos.x - (x0 + x1) / 2) <= width / 2 + DECK_MARGIN_M &&
    Math.abs(f.pos.z - (z0 + z1) / 2) <= depth / 2 + DECK_MARGIN_M;
  const isSound = Number.isFinite(width + depth + height) && width >= MIN_DECK_M && depth >= MIN_DECK_M;
  const isUnderRig = fixtures.filter(isOver).length >= fixtures.length * MIN_OVER_DECK;
  if (isSound && isUnderRig && (height !== 0 || width >= (bx - ax) * MIN_GROUND_SHARE))
    return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, halfWidth: width / 2, halfDepth: depth / 2, floor: height };
  const [halfWidth, halfDepth] = [Math.max((bx - ax) / 2, MIN_HALF_M), Math.max((bz - az) / 2, MIN_HALF_M)];
  return { cx: (ax + bx) / 2, cz: (az + bz) / 2, halfWidth, halfDepth, floor: 0 };
}

/**
 * The place of each unit across its row: -1 at the unit farthest left of the centre line, 1 at the one farthest
 * right, in proportion to the distance from the centre line, so a unit and its mirror image get opposite values. A
 * row on one side only keeps to that side. One unit, or one column of units, is 0: it has no side.
 */
export function sideOf(area: LookArea, units: readonly Placed[]): (f: Placed) => number {
  const xs = units.map((f) => f.pos.x).filter(Number.isFinite);
  const spread = xs.length === 0 ? 0 : Math.max(...xs) - Math.min(...xs);
  const reach = Math.max(0, ...xs.map((x) => Math.abs(x - area.cx)));
  return (f) => (spread < MIN_SPREAD_M ? 0 : clamp((f.pos.x - area.cx) / reach, -1, 1));
}

/**
 * The units from left to right; units at one distance from the centre line run upstage to downstage on the left and
 * the other way on the right. So the unit at rank i and the unit at rank n - 1 - i are a mirrored pair, row by row,
 * also on a real plot whose two sides differ by some centimetres.
 */
export function mirrorOrder<T extends Placed>(units: readonly T[], cx: number): T[] {
  return [...units].sort((a, b) => {
    const side = a.pos.x < cx ? 1 : -1;
    return a.pos.x - b.pos.x || side * (a.pos.z - b.pos.z) || side * (a.pos.y - b.pos.y) || side * (a.id - b.id);
  });
}
