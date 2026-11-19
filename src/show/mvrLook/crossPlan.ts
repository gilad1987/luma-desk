import { clamp } from '../../core';
import { sideOf, type LookArea, type LookPoint, type Placed } from './lookArea';

/** Metres along a tower or floor beam where its aim point is put; only the direction matters. */
const THROW_M = 20;
/** Share of the half width past the centre line where a tower beam lands: the two towers cross over the centre. */
const CROSS_SHARE = 0.35;
/** Tower beams cross between head height and truss height (metres above the floor), higher units higher. */
const CROSS_LOW_M = 2;
const CROSS_RISE_M = 5;
/** The hang height in metres at which a tower unit crosses at the top of that band. */
const TOWER_TOP_M = 10;
/** How far a floor beam leans out to its own side and to the audience for each metre it rises. */
const UP_OUT = 0.45;
const UP_FRONT = 0.2;

/**
 * Tower cross: a side unit aims over the centre line at a point between head and truss height, a higher unit at a
 * higher point, so the two towers draw crossing fans above the band and no beam lands on a performer's face.
 */
export function towerCrossOf(area: LookArea): (f: Placed) => LookPoint {
  return (f) => {
    const sign = f.pos.x < area.cx ? 1 : -1;
    const rise = clamp((f.pos.y - area.floor) / TOWER_TOP_M, 0, 1) * CROSS_RISE_M;
    return [area.cx + sign * area.halfWidth * CROSS_SHARE, area.floor + CROSS_LOW_M + rise, area.cz];
  };
}

/** Floor beams: straight up, leaning out to the unit's own side and a little to the audience, mirrored. */
export function floorUpOf(area: LookArea, ups: readonly Placed[]): (f: Placed) => LookPoint {
  const side = sideOf(area, ups);
  return (f) => [f.pos.x + side(f) * UP_OUT * THROW_M, f.pos.y + THROW_M, f.pos.z + UP_FRONT * THROW_M];
}
