/** Tower crosses, floor up-beams, tone and side-wash points of the first look. */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { Fixture } from '../../../src/domain/Fixture';
import { floorUpOf, towerCrossOf } from '../../../src/show/mvrLook/crossPlan';
import type { LookPoint } from '../../../src/show/mvrLook/lookArea';
import { reachAim } from '../../../src/show/mvrLook/reach';
import { crossPointOf, tonePointOf } from '../../../src/show/mvrLook/tonePlan';
import { AREA, fx, row } from './lookRig';

const dirOf = (f: Fixture, point: LookPoint): Vector3 => new Vector3(...point).sub(f.pos).normalize();

describe('towerCrossOf', () => {
  const point = towerCrossOf(AREA);

  it('crosses the two towers over the centre line between head and truss height, higher units higher', () => {
    expect(point(fx(1, 'spot', [-10, 6, 0]))).toEqual([8 * 0.35, 5.5, 0]);
    expect(point(fx(2, 'spot', [10, 6, 0]))).toEqual([-8 * 0.35, 5.5, 0]);
    expect(point(fx(3, 'spot', [-10, 9, 0]))[1]).toBe(7);
    expect(point(fx(4, 'spot', [-10, 40, 0]))[1]).toBe(8);
  });
});

describe('floorUpOf', () => {
  const ups = row(1, 'beam', 5, [1.3, -4]);
  const point = floorUpOf(AREA, ups);

  it('shoots up, out to the own side and a little to the audience, mirrored', () => {
    const dirs = ups.map((f) => dirOf(f, point(f)));
    for (const d of dirs) expect([d.y > 0.85, d.z > 0]).toEqual([true, true]);
    expect(dirs.map((d) => Math.sign(d.x))).toEqual([-1, -1, 0, 1, 1]);
    dirs.forEach((d, i) => expect(dirs[4 - i]?.x).toBeCloseTo(-d.x, 9));
  });
});

describe('tonePointOf and crossPointOf', () => {
  it('lands each overhead wash on the deck, downstage of itself, never straight under its own truss', () => {
    const point = tonePointOf(AREA);
    for (const f of [...row(1, 'wash', 5, [9, -4]), ...row(10, 'wash', 5, [9, 4]), fx(20, 'wash', [30, 9, -40])]) {
      const [x, y, z] = point(f);
      expect([Math.abs(x) <= 7.2, y, Math.abs(z) <= 4.5]).toEqual([true, 1, true]);
      expect(Math.abs(reachAim(f, point(f)).tilt)).toBeGreaterThanOrEqual(8);
    }
    expect(point(fx(1, 'wash', [-4, 9, -2]))).toEqual([-3.4, 1, 0.5]);
    expect(point(fx(2, 'wash', [4, 9, -2]))).toEqual([3.4, 1, 0.5]);
  });

  it('lands each side wash on its own half of the band at face height', () => {
    expect(crossPointOf(AREA)(fx(1, 'wash', [-10, 5, 0]))).toEqual([-2, 2.6, 0]);
    expect(crossPointOf(AREA)(fx(2, 'wash', [10, 5, 0]))).toEqual([2, 2.6, 0]);
  });
});
