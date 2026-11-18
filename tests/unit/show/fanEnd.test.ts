/**
 * The audience fans of the first look end over the first seat rows of a file that draws its seats, 2.5 to 4 m above
 * the seat plane, and not inside a raked house: beams aimed into the seats veil the stage for the front rows.
 */
import { describe, expect, it } from 'vitest';
import type { StageBounds } from '../../../src/domain/stage/types';
import { fanEndOf } from '../../../src/show/mvrLook/fanEnd';
import { houseRunOf, overheadFanOf } from '../../../src/show/mvrLook/fanPlan';
import { AREA, row } from './lookRig';

const EDGE = AREA.cz + AREA.halfDepth;
/** A raked house: 40 m of rows from 3 m in front of the deck, rising 8 m. */
const RAKED: StageBounds = { min: [-20, 0, EDGE + 3], max: [20, 8, EDGE + 43] };
/** A flat floor of seats 0.5 m under the stage floor. */
const FLAT: StageBounds = { min: [-20, AREA.floor - 0.5, EDGE + 2], max: [20, AREA.floor - 0.5, EDGE + 20] };
const fans = row(1, 'spot', 7, [9, -2]);

/** The height of the seat plane at world z, for a house that rises evenly from its front to its back. */
const planeAt = ({ min, max }: StageBounds, z: number): number =>
  min[1] + ((z - min[2]) / (max[2] - min[2])) * (max[1] - min[1]);

describe('fanEndOf', () => {
  it('keeps the plot rule for a file without seats, and for seats that are all upstage of the deck edge', () => {
    expect(fanEndOf(AREA, fans)).toBe(houseRunOf(AREA, fans));
    const upstage: StageBounds = { min: [-20, 0, -40], max: [20, 4, EDGE - 1] };
    expect(fanEndOf(AREA, fans, upstage)).toBe(houseRunOf(AREA, fans));
  });

  it.each([RAKED, FLAT])('ends over the first third of the rows (%#)', (seats) => {
    const end = fanEndOf(AREA, fans, seats);
    if (typeof end === 'number') throw new Error('no fan end from the seats');
    const z = EDGE + end.run;
    expect(z).toBeGreaterThan(seats.min[2]);
    expect(z).toBeLessThanOrEqual(seats.min[2] + (seats.max[2] - seats.min[2]) / 3);
  });

  it('ends 2.5 to 4 m over the seat plane of a raked house, where 5 m over the stage floor is too low', () => {
    const steep: StageBounds = { min: [-20, 2, EDGE + 3], max: [20, 20, EDGE + 27] };
    const end = fanEndOf(AREA, fans, steep);
    if (typeof end === 'number') throw new Error('no fan end from the seats');
    const over = end.height - planeAt(steep, EDGE + end.run);
    expect(over).toBeGreaterThanOrEqual(2.5);
    expect(over).toBeLessThanOrEqual(4);
    expect(end.height).toBeGreaterThan(AREA.floor + 5);
  });

  it('never ends lower than without seats, and aims every beam of the fan at that height', () => {
    const end = fanEndOf(AREA, fans, FLAT);
    if (typeof end === 'number') throw new Error('no fan end from the seats');
    expect(end.height).toBe(AREA.floor + 5);
    const point = overheadFanOf(AREA, fans, end);
    for (const f of fans) {
      expect(point(f)[1]).toBe(end.height);
      expect(point(f)[2]).toBeCloseTo(EDGE + end.run);
    }
  });
});
