import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { rng } from '../../../src/core/index.ts';
import { aimAt, dirFrom } from '../../../src/domain/aim.ts';
import { TYPES } from '../../../src/domain/fixtureTypes/index.ts';
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

describe('rotation (G2)', () => {
  const spot = { pos: new Vector3(2, 12, -6), T: TYPES.spot };
  const halfTurnZ = new Quaternion(0, 0, 1, 0);

  it('changes nothing with the identity rotation on a hung unit', () => {
    const results = (g: Parameters<typeof aimAt>[0]) =>
      jsonRoundTrip([aimAt(g, 3, DECK + 1.5, -8), dirFrom(g, 30, 40, new Vector3())]);
    for (const f of rig.fixtures.filter((x) => x.mount === 'hang')) {
      expect(results({ pos: f.pos, mount: f.mount, T: f.T, rotation: new Quaternion() })).toEqual(results(f));
    }
  });

  it('gives the floor direction at pan 0 for every tilt when turned 180 degrees about Z', () => {
    for (let tilt = -135; tilt <= 135; tilt += 15) {
      const turned = dirFrom({ mount: 'hang', rotation: halfTurnZ }, 0, tilt, new Vector3());
      expect(turned.distanceTo(dirFrom({ mount: 'floor' }, 0, tilt, new Vector3()))).toBeLessThan(1e-12);
    }
  });

  it('ignores mount when a rotation is present', () => {
    const hang = { ...spot, mount: 'hang' as const, rotation: halfTurnZ };
    const floor = { ...spot, mount: 'floor' as const, rotation: halfTurnZ };
    expect(aimAt(floor, 5, 0, 3)).toEqual(aimAt(hang, 5, 0, 3));
    expect(dirFrom(floor, 20, 50, new Vector3())).toEqual(dirFrom(hang, 20, 50, new Vector3()));
  });

  it('points dirFrom at the target that aimAt aimed at, for random rotations', () => {
    // aimAt rounds pan and tilt to 0.1 degree, so each may be off by 0.05 degree: at most √2·0.05° ≈ 1.23e-3 apart.
    const [random, maxError] = [rng(7), Math.SQRT2 * 0.05 * (Math.PI / 180) + 1e-9];
    for (let i = 0; i < 500; i++) {
      const rotation = new Quaternion(random() - 0.5, random() - 0.5, random() - 0.5, random() - 0.5).normalize();
      const f = { ...spot, mount: 'hang' as const, rotation };
      // A target the body can reach: tilt 5-130 in its own pose, so the near-vertical pan reset and the clamp stay out.
      const want = dirFrom(f, random() * 360 - 180, 5 + random() * 125, new Vector3());
      const { x, y, z } = want.clone().multiplyScalar(10).add(f.pos);
      const aim = aimAt(f, x, y, z);
      expect(dirFrom(f, aim.pan, aim.tilt, new Vector3()).distanceTo(want)).toBeLessThan(maxError);
    }
  });
});
