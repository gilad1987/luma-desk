/** The key light of the first look: a grid of pools sized to the throw, spread evenly over the band area. */
import { describe, expect, it } from 'vitest';
import { followZoomOf, keyPlanOf, leadPointOf } from '../../../src/show/mvrLook/keyPlan';
import { aimErrorDeg, reachAim } from '../../../src/show/mvrLook/reach';
import { AREA, fx, row, STANDING } from './lookRig';

describe('keyPlanOf', () => {
  const front = row(1, 'wash', 6, [8, 7, 6]);
  const plan = keyPlanOf(AREA, front);
  const xs = front.map((f) => plan.point(f)[0]);

  it('sizes the pool so six units cover the band area of 12.8 x 5 m with 30 % overlap: 4.67 m, one row', () => {
    expect(plan.bandArea).toBeCloseTo(64, 9);
    expect(plan.pool).toBeCloseTo(4.666, 2);
    expect(plan.rows).toBe(1);
  });

  it('spreads the key points evenly over the band width, the outer pools ending at the band edge, at face height', () => {
    [-4.067, -2.44, -0.813, 0.813, 2.44, 4.067].forEach((x, i) => expect(xs[i]).toBeCloseTo(x, 2));
    expect((xs[5] ?? 0) + plan.pool / 2).toBeCloseTo(6.4, 9);
    for (const f of front) {
      expect(plan.point(f)[1]).toBeCloseTo(2.6, 9);
      expect(plan.point(f)[2]).toBeCloseTo(1.5, 9);
    }
  });

  it('keeps each unit on its own side, so no two key beams cross, and mirrors a mirrored pair', () => {
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    front.forEach((f, i) => expect(Math.sign(xs[i] ?? 0)).toBe(Math.sign(f.pos.x)));
    xs.forEach((x, i) => expect(xs[xs.length - 1 - i]).toBeCloseTo(-x, 9));
  });

  it('aims one unit, or one column of units, at the centre line and spreads a one-sided row over the band', () => {
    const one = fx(1, 'wash', [3, 8, 7]);
    expect(keyPlanOf(AREA, [one]).point(one)[0]).toBe(0);
    const column = [fx(1, 'wash', [3, 8, 7]), fx(2, 'wash', [3, 10, 7])];
    expect(column.map((f) => keyPlanOf(AREA, column).point(f)[0])).toEqual([0, 0]);
    const left = [fx(1, 'wash', [-6, 8, 7]), fx(2, 'wash', [-3, 8, 7])];
    const [outer = 0, inner = 0] = left.map((f) => keyPlanOf(AREA, left).point(f)[0]);
    expect([outer < 0, inner]).toEqual([true, -outer]);
    const gap = [-7, -6, -5, 5, 6, 7].map((x, i) => fx(i + 1, 'wash', [x, 8, 7]));
    const cols = gap.map((f) => keyPlanOf(AREA, gap).point(f)[0]);
    cols.slice(1).forEach((x, i) => expect(x - (cols[i] ?? 0)).toBeCloseTo((cols[1] ?? 0) - (cols[0] ?? 0), 9));
  });

  it('takes two rows in depth when twelve units make a pool of 3.3 m, neighbours in different rows, mirrored', () => {
    const twelve = row(1, 'wash', 12, [8, 7, 6]);
    const grid = keyPlanOf(AREA, twelve);
    const zs = twelve.map((f) => +grid.point(f)[2].toFixed(3));
    expect([grid.rows, +grid.pool.toFixed(2)]).toEqual([2, 3.3]);
    expect(zs).toEqual([0.25, 2.75, 0.25, 2.75, 0.25, 2.75, 2.75, 0.25, 2.75, 0.25, 2.75, 0.25]);
  });

  it('never makes a pool under 3 m, however many units share the band', () => {
    expect(keyPlanOf(AREA, row(1, 'wash', 60, [8, 7, 6])).pool).toBe(3);
  });

  it('moves the point of a standing unit over the band across the centre line, to a pool it can reach, mirrored', () => {
    const high = [fx(1, 'spot', [-6, 10, 2], STANDING), fx(2, 'spot', [6, 10, 2], STANDING)];
    const [left = [0, 0, 0], right = [0, 0, 0]] = high.map(keyPlanOf(AREA, high).point);
    high.forEach((f, i) => {
      const point = i === 0 ? left : right;
      expect(aimErrorDeg(f, reachAim(f, point), point)).toBeLessThanOrEqual(8);
    });
    expect([left[0] > 0, Math.abs(left[0]) <= 6.4]).toEqual([true, true]);
    expect(right[0]).toBeCloseTo(-left[0], 9);
    const hung = [fx(1, 'spot', [-6, 10, 2]), fx(2, 'spot', [6, 10, 2])];
    expect(hung.map((f) => Math.sign(keyPlanOf(AREA, hung).point(f)[0]))).toEqual([-1, 1]);
  });

  it('zooms a unit to the pool from its real throw, inside the zoom range of its type', () => {
    expect(plan.zoom(fx(1, 'wash', [-6, 8, 7])).zoom).toBeCloseTo(32.7, 1);
    expect(plan.zoom(fx(9, 'wash', [0, 12, 35])).zoom).toBe(10);
    expect(Number.isFinite(plan.zoom(fx(9, 'wash', [NaN, 12, 35])).zoom)).toBe(true);
  });

  it('counts the output that lands on the band area: all of it from near, less from a far unit', () => {
    expect(plan.output(fx(1, 'wash', [-6, 8, 7]))).toBe(0.9);
    expect(plan.output(fx(9, 'wash', [0, 12, 62]))).toBeCloseTo(0.64, 1);
  });
});

describe('the follow spots', () => {
  it('hold the lead position, centre front, with a 3 m pool', () => {
    const lead = leadPointOf(AREA);
    [0, 2.6, 3].forEach((v, i) => expect(lead[i]).toBeCloseTo(v, 9));
    expect(followZoomOf(AREA)(fx(1, 'follow', [0, 8, 33])).zoom).toBeCloseTo(5.6, 1);
  });
});
