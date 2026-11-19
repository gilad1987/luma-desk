import type { StageBounds } from '../../domain/stage/types';
import { houseRunOf, type FanEnd } from './fanPlan';
import type { LookArea, Placed } from './lookArea';

/** The fans end this far into the seat rows at the most (m), and never past the first third of their depth. */
const FIRST_ROWS_M = 8;
const ROW_SHARE = 1 / 3;
/**
 * Metres over the seat plane where a fan beam ends: over the heads and raised phones of a standing audience (2.5 m),
 * under 4 m so the fan still reads as aimed at the house and not at the roof.
 */
const OVER_SEATS_M = 3.25;
/** The end points are at least this high over the stage floor (m), as without seats (`END_HEIGHT_M` of `fanPlan`). */
const MIN_HEIGHT_M = 5;

/**
 * Where the overhead fans of the first look end. A file that draws its seats (`StageFrame.seats`) ends them over the
 * first seat rows, `OVER_SEATS_M` above the seat plane there: a fixed height over the stage floor lies inside a raked
 * house, and beams aimed into the seats lay a wall of lit haze between the front rows and the stage. The seat plane
 * is taken to rise evenly from the front of the seat box to its back, which is right for a rake and too high for a
 * flat floor with a balcony; too high only lifts the fan. Seats that are all upstage of the deck edge are no house.
 * Without seats the rule of `houseRunOf` applies: the run from the plot, the height over the stage floor.
 */
export function fanEndOf(area: LookArea, fixtures: readonly Placed[], seats?: StageBounds): number | FanEnd {
  const edge = area.cz + area.halfDepth;
  const front = seats ? Math.max(seats.min[2], edge) : edge;
  const depth = seats ? seats.max[2] - front : 0;
  if (!seats || !(depth > 0)) return houseRunOf(area, fixtures);
  const into = Math.min(FIRST_ROWS_M, ROW_SHARE * depth);
  // The plane rises over the whole seat box, also where its front is cut to the deck edge.
  const rise = (front + into - seats.min[2]) / (seats.max[2] - seats.min[2]);
  const plane = seats.min[1] + rise * (seats.max[1] - seats.min[1]);
  return { run: front + into - edge, height: Math.max(plane + OVER_SEATS_M, area.floor + MIN_HEIGHT_M) };
}
