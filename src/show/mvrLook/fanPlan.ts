import { clamp, D2R } from '../../core';
import { mirrorOrder, type LookArea, type LookPoint, type Placed } from './lookArea';

/** Where the overhead fans end: metres past the downstage edge of the deck, and the world height of the end points. */
export interface FanEnd {
  readonly run: number;
  readonly height: number;
}

/** Degrees between neighbouring beams of one overhead row: equal steps make a fan the eye can count. */
const FAN_STEP_DEG = 10;
/** Degrees the outermost beam of a row turns out at the most; a longer row takes smaller equal steps. */
const FAN_MAX_DEG = 45;
/** Metres past the deck edge where an overhead beam ends when the plot shows no house: past the first seat rows. */
const RUN_M = 22;
/** A unit this far downstage of the deck edge stands in the house; the run stays between these limits. */
const HOUSE_FROM_M = 3;
const MIN_RUN_M = 15;
const MAX_RUN_M = 40;
/**
 * Metres above the stage floor where an overhead beam ends: over the heads of the audience, and over the eyes at
 * front of house also after the radius of a spot beam at that distance.
 */
const END_HEIGHT_M = 5;
/** Overhead units nearer than this in depth to their neighbour hang on one truss: one row, one fan. */
const ROW_GAP_M = 0.75;
/** The overhead units by truss row, upstage first. */
function rowsOf(fans: readonly Placed[]): Placed[][] {
  const rows: Placed[][] = [];
  let last = -Infinity;
  for (const f of [...fans].sort((a, b) => a.pos.z - b.pos.z || a.id - b.id)) {
    if (f.pos.z - last > ROW_GAP_M) rows.push([]);
    rows.at(-1)?.push(f);
    last = f.pos.z;
  }
  return rows;
}

/**
 * The pan of each overhead beam away from straight downstage, in degrees. Each truss row is one fan: its middle
 * runs straight, and every unit turns one equal step further out than its neighbour, by rank and not by place, so a
 * plot with centimetre noise still gives clean steps and the two sides mirror. The step is 10 degrees, less on a
 * long row so the outer beams stay inside 45.
 */
export function fanYawOf(area: LookArea, fans: readonly Placed[]): (f: Placed) => number {
  const yaws = new Map<number, number>();
  for (const row of rowsOf(fans)) {
    const mid = (row.length - 1) / 2;
    const step = Math.min(FAN_STEP_DEG, FAN_MAX_DEG / Math.max(mid, 1));
    mirrorOrder(row, area.cx).forEach((f, i) => yaws.set(f.id, (i - mid) * step));
  }
  return (f) => yaws.get(f.id) ?? 0;
}

/**
 * Overhead fan: every beam runs downstage over the audience and ends `run` metres past the deck edge (`houseRunOf`) at `END_HEIGHT_M`
 * over the stage floor. So the shaft has a long, shallow run in the haze, it never ends in the floor under its own
 * truss, and it passes over front of house and not into it. Upstage rows lie flatter than downstage rows, which
 * layers the fans.
 */
export function overheadFanOf(
  area: LookArea,
  fans: readonly Placed[],
  end: number | FanEnd = RUN_M,
): (f: Placed) => LookPoint {
  const yaw = fanYawOf(area, fans);
  const { run, height } = typeof end === 'number' ? { run: end, height: area.floor + END_HEIGHT_M } : end;
  const endZ = area.cz + area.halfDepth + run;
  return (f) => {
    const reach = Math.max(endZ - f.pos.z, 1);
    return [f.pos.x + Math.tan(yaw(f) * D2R) * reach, height, f.pos.z + reach];
  };
}

/**
 * How far past the deck edge the overhead beams run, in metres. The look is built from the rig and the stage frame
 * only: the seat proxies of an MVR file stay in the import's geometry and the front-of-house camera in the renderer,
 * and neither is in the stage design, which is all a reload has to build the same look again. So the house is read
 * from what the plot shows: the farthest unit that hangs or stands in the house (a front truss, a follow spot) marks
 * its depth, held between 15 and 40 m; a plot without one gets `RUN_M`.
 */
export function houseRunOf(area: LookArea, fixtures: readonly Placed[]): number {
  const edge = area.cz + area.halfDepth;
  const depths = fixtures.map((f) => f.pos.z - edge).filter((d) => Number.isFinite(d) && d > HOUSE_FROM_M);
  return depths.length === 0 ? RUN_M : clamp(Math.max(...depths), MIN_RUN_M, MAX_RUN_M);
}
