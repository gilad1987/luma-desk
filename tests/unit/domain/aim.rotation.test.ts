/**
 * Owns the G2 rotation path of `aimAt` and `dirFrom` in ordinary poses: the identity rotation changes nothing on the
 * built-in hung units, a half turn about Z gives the floor pose and overrides `mount`, and random rotations round-trip
 * within the 0.1 degree rounding of `aimAt`. Edge poses are in aim.rotationEdges.test.ts, tilt-only bars in
 * aim.tiltOnlyRotation.test.ts and the no-rotation goldens in aim.test.ts.
 */
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { rng } from '../../../src/core/index.ts';
import { aimAt, dirFrom } from '../../../src/domain/aim.ts';
import { TYPES } from '../../../src/domain/fixtureTypes/index.ts';
import { buildRig } from '../../../src/domain/rig/index.ts';
import { DECK } from '../../../src/domain/venue.ts';
import { jsonRoundTrip } from '../../shared/index.ts';

const rig = buildRig();

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
