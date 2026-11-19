import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { D2R } from '../../../src/core';
import { ATTR } from '../../../src/domain/attributes';
import type { LookPoint } from '../../../src/show/mvrLook/lookArea';
import { aimErrorDeg, MIN_TILT_DEG, reachAim } from '../../../src/show/mvrLook/reach';
import { fx, ON_ITS_SIDE, STANDING } from './lookRig';

const HANGS = [
  ['hanging', undefined],
  ['standing on the floor', STANDING],
  ['on its side on a tower', ON_ITS_SIDE],
] as const;

/** Targets every one of the three hangs can reach from (-9, 6, -1): band, truss height, house, far wing. */
const TARGETS: readonly LookPoint[] = [
  [0, 2.6, 1.75],
  [3, 8, 2],
  [-2, 3, 8],
  [12, 2, -5],
];

describe.each(HANGS)('reachAim on a head %s', (_name, rotation) => {
  const f = fx(1, 'spot', [-9, 6, -1], rotation);
  /** A point 10 m from the head along `local`, a direction in the head's rest frame (beam down, base up). */
  const along = (local: Vector3): LookPoint => {
    const d = rotation ? local.applyQuaternion(rotation) : local;
    return [f.pos.x + d.x * 10, f.pos.y + d.y * 10, f.pos.z + d.z * 10];
  };

  it('points the real beam at each target, inside the pan and tilt ranges of the desk', () => {
    for (const target of TARGETS) {
      const pose = reachAim(f, target);
      expect(Math.abs(pose.pan)).toBeLessThanOrEqual(ATTR.pan.max);
      expect(Math.abs(pose.tilt)).toBeLessThanOrEqual(ATTR.tilt.max);
      expect(aimErrorDeg(f, pose, target), `target ${target.join(',')}`).toBeLessThan(0.2);
    }
  });

  it('stops at the tilt limit, the nearest reachable direction, for a target behind its own base', () => {
    const target = along(new Vector3(Math.sin(20 * D2R), Math.cos(20 * D2R), 0));
    const pose = reachAim(f, target);
    expect(Math.abs(pose.tilt)).toBe(135);
    expect(aimErrorDeg(f, pose, target)).toBeCloseTo(25, 0);
  });

  it('moves a pose on the yoke axis out to the smallest tilt of the look', () => {
    expect(Math.abs(reachAim(f, along(new Vector3(0, -1, 0))).tilt)).toBe(MIN_TILT_DEG);
  });

  it('never returns NaN: a broken place or target gives the safe pose', () => {
    const safe = { pan: 0, tilt: 45 };
    expect(reachAim(f, [NaN, 0, 0])).toEqual(safe);
    expect(reachAim(f, [0, Infinity, 0])).toEqual(safe);
    expect(reachAim(fx(2, 'spot', [NaN, 6, 0], rotation), [0, 0, 0])).toEqual(safe);
    const same = reachAim(f, [f.pos.x, f.pos.y, f.pos.z]);
    expect([Number.isFinite(same.pan), Number.isFinite(same.tilt)]).toEqual([true, true]);
  });
});

describe('reachAim on a tilt-only bar', () => {
  it('keeps pan 0 and may rest at tilt 0', () => {
    const bar = fx(1, 'bar', [0, 6, 0]);
    expect(reachAim(bar, [0, 1, 0])).toEqual({ pan: 0, tilt: 0 });
    expect(reachAim(bar, [4, 1, 5]).pan).toBe(0);
  });
});
