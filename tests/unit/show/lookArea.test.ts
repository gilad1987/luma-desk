/** The area the first look is composed on, and the mirrored order its plans share. */
import { describe, expect, it } from 'vitest';
import { lookAreaOf, mirrorOrder } from '../../../src/show/mvrLook/lookArea';
import { AREA, concertRig, DECK, frameWith, fx, NO_DECK, row } from './lookRig';

/** The rectangle an import gives a file without a deck: the desk's stage on the ground. */
const GROUND = { x0: -8, x1: 8, z0: -5, z1: 5, height: 0 };

describe('lookAreaOf', () => {
  it('is the deck of the stage when the rig hangs over it', () => {
    expect(lookAreaOf(frameWith(DECK), [])).toEqual(AREA);
    expect(lookAreaOf(frameWith(DECK), concertRig(100).fixtures)).toEqual(AREA);
  });

  it('is the box around the hung fixtures on a floor at 0 when the deck is broken', () => {
    const cloud = [fx(1, 'spot', [-4, 6, -2]), fx(2, 'spot', [6, 7, 2]), fx(3, 'beam', [30, 0.3, 9])];
    const area = { cx: 1, cz: 0, halfWidth: 5, halfDepth: 2, floor: 0 };
    expect(lookAreaOf(frameWith(NO_DECK), cloud)).toEqual(area);
    expect(lookAreaOf(frameWith({ ...NO_DECK, x1: NaN }), cloud)).toEqual(area);
    expect(lookAreaOf(frameWith(NO_DECK), [])).toEqual({ cx: 0, cz: 0, halfWidth: 2, halfDepth: 2, floor: 0 });
  });

  it('is the area under the rig when a 70 m rig stands over the 16 m ground rectangle of a file without a deck', () => {
    const wide = [
      ...row(1, 'spot', 12, [16, -6, 22]),
      ...row(20, 'par', 40, [12, -18, 35]),
      ...row(70, 'par', 40, [9, 0, 35]),
    ];
    expect(lookAreaOf(frameWith(GROUND), wide)).toEqual({ cx: 0, cz: -9, halfWidth: 35, halfDepth: 9, floor: 0 });
  });

  it('keeps the ground rectangle for a rig of its own size, and drops a deck the rig does not hang over', () => {
    expect(lookAreaOf(frameWith(GROUND), row(1, 'spot', 6, [6, 0, 6]))).toEqual({ ...AREA, floor: 0 });
    const away = row(1, 'spot', 6, [6, 40, 6]);
    expect(lookAreaOf(frameWith(DECK), away)).toEqual({ cx: 0, cz: 40, halfWidth: 6, halfDepth: 2, floor: 0 });
  });
});

describe('mirrorOrder', () => {
  it('pairs rank i with rank n - 1 - i, row by row, also with centimetre noise between the sides', () => {
    const plot = [
      fx(1, 'beam', [-6.02, 9, 1]),
      fx(2, 'beam', [-6.02, 9, -3]),
      fx(3, 'beam', [-2, 9, 1]),
      fx(4, 'beam', [2.01, 9, 1]),
      fx(5, 'beam', [6, 9, 1]),
      fx(6, 'beam', [6, 9, -3]),
    ];
    expect(mirrorOrder(plot, 0).map((f) => f.id)).toEqual([2, 1, 3, 4, 5, 6]);
  });
});
