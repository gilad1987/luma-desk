import type { StageBounds, Vec3 } from '../../domain/stage/types';
import { linkedGroups } from './linkedGroups';
import { withPoints } from './proxyPoints';
import { boxOf } from './rigCluster';

/** The seats of a stage as the Wide, Top and Crowd views frame them, and what those views leave out. */
export interface SeatCluster {
  /** The box around the seats that belong to the stage; absent when no seat does. */
  readonly seats?: StageBounds;
  /** Drawn seats and panels of shown layers that stand far from the stage and its seats; none is hidden. */
  readonly far: number;
}

/** Seat blocks nearer than this in plan are one house (m): an aisle, a mixing position or a moat lies between. */
const SEAT_GAP = 10;
/** Seats are grouped by plan cells of this size (m), so a house of 20 000 seats compares cells, not seat pairs. */
const CELL = 2;
/** The house starts at most this far from the stage box in plan (m), or the plan diagonal of the stage if longer. */
const REACH = 30;

const finite = (point: Vec3): boolean => point.every(Number.isFinite);

/** The distance in plan from `box` to a point; 0 inside. */
function away(box: StageBounds, [x, , z]: Vec3): number {
  return Math.hypot(Math.max(box.min[0] - x, 0, x - box.max[0]), Math.max(box.min[2] - z, 0, z - box.max[2]));
}

/** The seats of each occupied plan cell, by the cell's centre point. */
function cells(seats: readonly Vec3[]): Map<Vec3, Vec3[]> {
  const byKey = new Map<string, { readonly centre: Vec3; readonly seats: Vec3[] }>();
  for (const seat of seats) {
    const [i, k] = [Math.floor(seat[0] / CELL), Math.floor(seat[2] / CELL)];
    const cell = byKey.get(`${i},${k}`) ?? { centre: [(i + 0.5) * CELL, 0, (k + 0.5) * CELL], seats: [] };
    cell.seats.push(seat);
    byKey.set(`${i},${k}`, cell);
  }
  return new Map([...byKey.values()].map((cell) => [cell.centre, cell.seats]));
}

/**
 * The seat blocks of a file: seats joined by steps of at most `SEAT_GAP` in plan (single linkage on the cell
 * centres, so the gap is exact to within one cell), each with its distance from `stage`, nearest first.
 */
function blocks(seats: readonly Vec3[], stage: StageBounds): { readonly seats: Vec3[]; readonly gap: number }[] {
  const byCentre = cells(seats);
  return linkedGroups([...byCentre.keys()], SEAT_GAP)
    .map((group) => group.flatMap((centre) => byCentre.get(centre) ?? []))
    .map((block) => ({ seats: block, gap: block.reduce((gap, seat) => Math.min(gap, away(stage, seat)), Infinity) }))
    .sort((a, b) => a.gap - b.gap || b.seats.length - a.seats.length);
}

/**
 * The seat area that belongs to `stage` (the rig box). Every shown proxy is in the scene box, so a file with a
 * second seat block far off, or a few far panels, had its overview fitted to those and showed the stage small. The
 * stage's own seats are the block nearest to it, if that starts within reach, and every other block that starts
 * within `SEAT_GAP` of the stage itself (the blocks at its sides). `far` counts the seats of the other blocks and
 * the panels more than `SEAT_GAP` outside the stage and its seats: they stay drawn and inside the zoom-out range,
 * and the caller reports the count instead of dropping them without a word.
 */
export function seatCluster(seats: readonly Vec3[], panels: readonly Vec3[], stage: StageBounds): SeatCluster {
  const all = seats.filter(finite);
  const reach = Math.max(REACH, Math.hypot(stage.max[0] - stage.min[0], stage.max[2] - stage.min[2]));
  const own = blocks(all, stage)
    .filter((block, i) => (i === 0 ? block.gap <= reach : block.gap <= SEAT_GAP))
    .flatMap((block) => block.seats);
  const area = own.length > 0 ? boxOf(own) : undefined;
  const house = area ? withPoints(stage, [area.min, area.max]) : stage;
  const farPanels = panels.filter((panel) => finite(panel) && away(house, panel) > SEAT_GAP).length;
  return { ...(area ? { seats: area } : {}), far: all.length - own.length + farPanels };
}
