/**
 * Owns the edge poses of the G2 rotation path in `aimAt` and `dirFrom`: half turns (the inverse quaternion is the
 * least stable there) and a floor mount that a rotation must override. Tilt-only bars are in
 * aim.tiltOnlyRotation.test.ts; the random round trip lives in aim.rotation.test.ts. Non-unit quaternions are made
 * unit before they reach a fixture (the parser and `rigFromDesign` normalize them), so they are not covered here.
 */
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { aimAt, dirFrom } from '../../../src/domain/aim.ts';
import type { Fixture } from '../../../src/domain/Fixture.ts';
import { TYPES } from '../../../src/domain/fixtureTypes/index.ts';

type Aimed = Pick<Fixture, 'pos' | 'mount' | 'T' | 'rotation'>;

const pos = new Vector3(-3, 10, 4);
/** aimAt rounds pan and tilt to 0.1 degree, so a round trip may miss by √2·0.05 degree. */
const maxError = Math.SQRT2 * 0.05 * (Math.PI / 180) + 1e-9;
const PAN_TILTS = [
  [-150, 20],
  [-45, 60],
  [0, 100],
  [80, 125],
  [170, 10],
] as const;

function roundTripError(f: Aimed, pan: number, tilt: number): number {
  const want = dirFrom(f, pan, tilt, new Vector3());
  const { x, y, z } = want.clone().multiplyScalar(8).add(f.pos);
  const aim = aimAt(f, x, y, z);
  return dirFrom(f, aim.pan, aim.tilt, new Vector3()).distanceTo(want);
}

function turn(axis: Vector3, angle: number): Quaternion {
  return new Quaternion().setFromAxisAngle(axis.normalize(), angle);
}

describe('rotation edge poses (G2)', () => {
  const spot = { pos, T: TYPES.spot, mount: 'hang' as const };

  it('round-trips aimAt and dirFrom at exact and near half turns', () => {
    const halfTurns = [
      new Quaternion(1, 0, 0, 0),
      new Quaternion(0, 1, 0, 0),
      new Quaternion(0, 0, 1, 0),
      turn(new Vector3(1, 2, -3), Math.PI - 1e-9),
      turn(new Vector3(-2, 1, 1), Math.PI + 1e-9),
    ];
    for (const rotation of halfTurns) {
      for (const [pan, tilt] of PAN_TILTS) {
        expect(roundTripError({ ...spot, rotation }, pan, tilt)).toBeLessThan(maxError);
      }
    }
  });

  it('aims a body turned upside down about X at a point straight above with pan 0 and tilt 0', () => {
    const upsideDown = { ...spot, rotation: new Quaternion(1, 0, 0, 0) };
    expect(dirFrom(upsideDown, 0, 0, new Vector3()).distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-12);
    expect(aimAt(upsideDown, pos.x, pos.y + 5, pos.z)).toEqual({ pan: 0, tilt: 0 });
  });

  it('aims a floor unit with the identity rotation as a hung unit, not as a floor unit', () => {
    const floor = { ...spot, mount: 'floor' as const };
    const rotated = { ...floor, rotation: new Quaternion() };
    expect([aimAt(rotated, pos.x, pos.y - 5, pos.z), dirFrom(rotated, 0, 0, new Vector3()).toArray()]).toEqual([
      { pan: 0, tilt: 0 },
      [0, -1, 0],
    ]);
    expect(dirFrom(floor, 0, 0, new Vector3()).toArray()).toEqual([0, 1, 0]);
  });
});
