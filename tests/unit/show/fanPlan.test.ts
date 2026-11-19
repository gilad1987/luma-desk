import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { D2R } from '../../../src/core';
import type { Fixture } from '../../../src/domain/Fixture';
import { fanYawOf, houseRunOf, overheadFanOf } from '../../../src/show/mvrLook/fanPlan';
import type { LookPoint } from '../../../src/show/mvrLook/lookArea';
import { reachAim } from '../../../src/show/mvrLook/reach';
import { AREA, fx, row, STANDING } from './lookRig';

const dirOf = (f: Fixture, point: LookPoint): Vector3 => new Vector3(...point).sub(f.pos).normalize();
const yawOf = (d: Vector3): number => Math.atan2(d.x, d.z) / D2R;
const pitchOf = (d: Vector3): number => Math.asin(-d.y) / D2R;

describe('overheadFanOf', () => {
  const fans = row(1, 'spot', 7, [9, -2]);
  const point = overheadFanOf(AREA, fans);

  it('runs the middle beam straight downstage and fans the row in equal steps of 10 degrees, mirrored', () => {
    fans.forEach((f, i) => expect(yawOf(dirOf(f, point(f)))).toBeCloseTo((i - 3) * 10, 6));
  });

  it('takes smaller equal steps on a long row, so the outer beams turn out 45 degrees at the most', () => {
    const long = row(1, 'spot', 19, [9, -2]);
    expect(long.map(fanYawOf(AREA, long))).toEqual(Array.from({ length: 19 }, (_, i) => (i - 9) * 5));
  });

  it('fans each truss row on its own and keeps clean steps on a plot with centimetre noise', () => {
    const plot = [-6.02, -2, 2.01, 6].map((x, i) => fx(i + 1, 'spot', [x, 9, -2]));
    const rig = [...plot, ...row(10, 'beam', 3, [9, 2])];
    expect(rig.map(fanYawOf(AREA, rig))).toEqual([-15, -5, 5, 15, -10, 0, 10]);
    const one = fx(1, 'spot', [4, 9, 0]);
    expect(fanYawOf(AREA, [one])(one)).toBe(0);
  });

  it('ends every beam 22 m past the deck edge, 5 m over the stage floor: a long shallow run over the heads', () => {
    for (const f of [...fans, fx(50, 'spot', [0, 14, -30])]) {
      const [, y, z] = point(f);
      expect([y, z]).toEqual([6, 27]);
      const pitch = pitchOf(dirOf(f, point(f)));
      expect([pitch > 0, pitch < 12]).toEqual([true, true]);
    }
  });

  it('gives a mirrored pair a mirrored pan and the same tilt, hanging or standing', () => {
    for (const rotation of [undefined, STANDING]) {
      const [left, right] = [fx(1, 'spot', [-7, 9, -2], rotation), fx(7, 'spot', [7, 9, -2], rotation)];
      const [l, r] = [reachAim(left, point(left)), reachAim(right, point(right))];
      expect(r.pan).toBeCloseTo(-l.pan, 6);
      expect(r.tilt).toBeCloseTo(l.tilt, 6);
      expect(Math.abs(l.pan)).toBeGreaterThan(0);
    }
  });
});

describe('houseRunOf', () => {
  it('runs 22 m when the plot shows no house, else to the farthest unit in the house, between 15 and 40 m', () => {
    expect(houseRunOf(AREA, row(1, 'wash', 4, [8, 7]))).toBe(22);
    expect(houseRunOf(AREA, [fx(1, 'follow', [0, 8, 33])])).toBe(28);
    expect(houseRunOf(AREA, [fx(1, 'spot', [0, 8, 9])])).toBe(15);
    expect(houseRunOf(AREA, [fx(1, 'spot', [0, 8, 90]), fx(2, 'spot', [0, 8, NaN])])).toBe(40);
  });

  it('ends the overhead fan at that depth', () => {
    const fans = row(1, 'spot', 3, [9, -2]);
    expect(fans.map((f) => overheadFanOf(AREA, fans, 28)(f)[2])).toEqual([33, 33, 33]);
  });
});
