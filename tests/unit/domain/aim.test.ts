import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { aimAt, dirFrom } from '../../../src/domain/aim';
import { buildRig } from '../../../src/domain/rig';
import { DECK } from '../../../src/domain/venue';
import { asRecorded, RECORDED_RIG as expected } from './recordedRig';

const rig = buildRig();

describe('aimAt', () => {
  it('matches the original for every fixture aimed at the stage', () => {
    const actual = rig.fixtures.map((f) => aimAt(f, 3, DECK + 1.5, -8));
    expect(asRecorded(actual)).toEqual(expected.fixtures.map((f) => f.aimStage));
  });

  it('matches the original for every fixture aimed over the house (pan wrap and tilt-only bars)', () => {
    const actual = rig.fixtures.map((f) => aimAt(f, -f.pos.x * 4, 40, f.pos.z + 30));
    expect(asRecorded(actual)).toEqual(expected.fixtures.map((f) => f.aimHouse));
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
    expect(aim.pan).toBe(0);
    expect(Math.abs(aim.tilt)).toBeLessThanOrEqual(95);
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
