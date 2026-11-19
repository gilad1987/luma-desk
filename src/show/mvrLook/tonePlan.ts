import { clamp } from '../../core';
import { FACE_HEIGHT_M } from './keyGrid';
import type { LookArea, LookPoint, Placed } from './lookArea';

/** Metres downstage of itself an overhead wash lands: light from behind the performer, which is back light. */
const BACK_THROW_M = 2.5;
/** Share of its own side offset an overhead wash keeps, so the outer pools stay on the deck. */
const TONE_PULL = 0.85;
/** Share of the half width and depth the tone pools stay inside. */
const TONE_EDGE = 0.9;
/** Share of the half width on its own side where a side wash lands: it lights its half, and both halves meet. */
const CROSS_NEAR = 0.25;

/**
 * The deck point of each overhead wash: under the unit, pulled a little to the centre and thrown downstage, so the
 * washes cover the whole deck as back light and none points straight down its own truss. Mirrored units get mirrored
 * points.
 */
export function tonePointOf(area: LookArea): (f: Placed) => LookPoint {
  const reachX = area.halfWidth * TONE_EDGE;
  const reachZ = area.halfDepth * TONE_EDGE;
  return (f) => {
    const x = area.cx + clamp((f.pos.x - area.cx) * TONE_PULL, -reachX, reachX);
    const z = area.cz + clamp(f.pos.z + BACK_THROW_M - area.cz, -reachZ, reachZ);
    return [x, area.floor, z];
  };
}

/** The point of each side wash: the near half of the band at face height, so side light models the performers. */
export function crossPointOf(area: LookArea): (f: Placed) => LookPoint {
  return (f) => {
    const sign = f.pos.x < area.cx ? -1 : 1;
    return [area.cx + sign * area.halfWidth * CROSS_NEAR, area.floor + FACE_HEIGHT_M, area.cz];
  };
}
