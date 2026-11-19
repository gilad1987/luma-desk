import { D2R } from '../../core';
import type { NamedColor } from '../../engine/colorByName';
import type { GroupBudget } from './lookLevels';

/** The area in square metres a unit lights at a throw of `throwM` metres with a beam of `zoomDeg` degrees. */
export function poolArea(throwM: number, zoomDeg: number): number {
  const radius = Math.max(throwM, 0) * Math.tan((zoomDeg * D2R) / 2);
  return Math.PI * radius * radius;
}

/**
 * The part of a unit's output that lands on an area of `area` square metres: all of its type power while its pool
 * fits inside the area, and the share `area / pool` once the pool is bigger. A pool grows with the square of the
 * throw, so a far unit that cannot zoom in any more gives less light where it is needed.
 */
export function landedOutput(power: number, pool: number, area: number): number {
  return pool > area ? (power * area) / pool : power;
}

/** How bright a colour reads next to open white (Rec. 709 weights), 0 to 1: deep blue is about 0.14, red 0.21. */
export function luminanceOf(color: NamedColor): number {
  return (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 100;
}

/** What an area needs: `lux` in level per cent times type power per square metre, and the lowest useful level. */
export interface AreaNeed {
  readonly lux: number;
  readonly area: number;
  readonly minLevel: number;
  /** Lights every unit, see `GroupBudget.all`. */
  readonly all?: boolean;
}

/**
 * The budget of a group that must light an area to a set brightness, from the stage and not from a constant. The
 * area needs `lux * area` in all; unit i gives `level * output[i]`, where its output is the type power that lands on
 * the area (`landedOutput`). So the level of the group is
 *
 *   level = lux * area / sum(output)   which is   lux * area * throw^2 * tan^2(zoom / 2) / power   for a far unit,
 *
 * held between `minLevel` and 100: a small rig runs at full and is not dim, and a big rig lights only as many units
 * at `minLevel` as the area needs and does not white out. The result is a `GroupBudget` (base 100, the number of
 * units at full the area needs), so `levelSteps` shares it like any other group. Outputs that sum to zero or are no
 * numbers (no type power, a broken throw) give every unit at 100: the need cannot be solved, and a dark key is worse.
 */
export function areaBudget(need: AreaNeed, outputs: readonly number[]): GroupBudget {
  const total = outputs.reduce((sum, output) => sum + (Number.isFinite(output) ? output : 0), 0);
  const units = total > 0 ? (need.lux * need.area * outputs.length) / (100 * total) : outputs.length;
  return { base: 100, budget: units, minShare: need.minLevel / 100, all: need.all === true };
}
