/**
 * Review R2-22: the seat area drops seats per layer as `farLayers` parks layers. A deep seat block whose front rows
 * are near the stage is drawn whole, so all its rows count; a block whose every seat is far is parked and does not.
 */
import { describe, expect, it } from 'vitest';
import { seatAreaOf, type SeatFit } from '../../../src/mvr/design/seatArea.ts';
import { seatRows } from '../../shared/index.ts';

const STAGE = { layer: 'L1', box: { min: [-5, 0, -5], max: [5, 2, 5] } };
const fit = { offset: [0, 0, 0], layers: [STAGE], positions: [] } as unknown as SeatFit;

describe('seat area of a deep seat block (R2-22)', () => {
  it('counts all 40 rows of a block whose front rows are near the stage', () => {
    const seats = seatRows(10, 40, 540, { symdef: 'S2', layer: 'L2' });
    const all = seatAreaOf(seats, { ...fit, layers: [] }).seatArea;
    expect(seatAreaOf(seats, fit).seatArea).toEqual(all);
  });

  it('leaves out a block whose every seat is far from the stage', () => {
    const far = seatRows(4, 2, 540, { symdef: 'S2', layer: 'L3' }).map((seat) => ({
      ...seat,
      matrix: seat.matrix.map((value, i) => (i === 12 ? value + 60000 : value)),
    }));
    expect(seatAreaOf(far, fit)).toEqual({});
  });
});
