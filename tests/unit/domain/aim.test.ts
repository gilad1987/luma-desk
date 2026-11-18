import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { aimAt, dirFrom } from '../../../src/domain/aim.ts';
import { buildRig } from '../../../src/domain/rig/index.ts';
import { DECK } from '../../../src/domain/venue.ts';
import { jsonRoundTrip } from '../../shared/index.ts';
import { RECORDED_RIG as expected } from './recordedRig.ts';

const rig = buildRig();

describe('aimAt', () => {
  it('matches the original for every fixture aimed at the stage', () => {
    const actual = rig.fixtures.map((f) => aimAt(f, 3, DECK + 1.5, -8));
    expect(jsonRoundTrip(actual)).toEqual(expected.fixtures.map((f) => f.aimStage));
  });

  it('matches the original for every fixture aimed over the house (pan wrap and tilt-only bars)', () => {
    const actual = rig.fixtures.map((f) => aimAt(f, -f.pos.x * 4, 40, f.pos.z + 30));
    expect(jsonRoundTrip(actual)).toEqual(expected.fixtures.map((f) => f.aimHouse));
  });

  it('rounds to 0.1 degree and zeroes pan for a near-vertical beam', () => {
    const hung = rig.get(301);
    if (!hung) throw new Error('fixture 301 missing');
    expect(aimAt(hung, hung.pos.x + 0.01, 0, hung.pos.z)).toEqual({ pan: 0, tilt: 0 });
  });

  it('clamps a tilt-only bar to ±95 and never pans it', () => {
    const bar = rig.get(2101);
    if (!bar) throw new Error('fixture 2101 missing');
    const aim = aimAt(bar, bar.pos.x, bar.pos.y - 1, bar.pos.z - 0.001);
    expect(aim).toEqual({ pan: 0, tilt: -95 });
  });

  it('keeps pan once the tilt passes 0.5 degree, and zeroes it below', () => {
    const hung = rig.get(301);
    if (!hung) throw new Error('fixture 301 missing');
    const off = (deg: number) => (hung.pos.y * Math.tan(deg * (Math.PI / 180))) / Math.SQRT2;
    expect(aimAt(hung, hung.pos.x + off(0.45), 0, hung.pos.z + off(0.45))).toEqual({ pan: 0, tilt: 0.5 });
    expect(aimAt(hung, hung.pos.x + off(0.55), 0, hung.pos.z + off(0.55))).toEqual({ pan: 45, tilt: 0.5 });
  });
});

describe('dirFrom', () => {
  it('matches the original beam direction for every fixture', () => {
    const actual = rig.fixtures.map((f) => dirFrom(f, 30, 40, new Vector3()).toArray());
    expect(actual).toEqual(expected.fixtures.map((f) => f.dir));
  });

  it('writes into and returns the given vector', () => {
    const out = new Vector3();
    expect(dirFrom({ mount: 'floor' }, 0, 0, out)).toBe(out);
    expect(out.toArray()).toEqual([0, 1, 0]);
    expect(dirFrom({ mount: 'hang' }, 0, 0, out).toArray()).toEqual([0, -1, 0]);
  });
});
