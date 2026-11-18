/**
 * Owns tilt-only bars (LED bars) with a G2 rotation: such a bar only tilts in its own Y-Z plane, so `aimAt` must find
 * the tilt in the turned plane, keep pan at 0 and ignore `mount`. Spots and washes with a rotation are covered in
 * aim.rotationEdges.test.ts and aim.rotation.test.ts.
 */
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { aimAt, dirFrom } from '../../../src/domain/aim.ts';
import { TYPES } from '../../../src/domain/fixtureTypes/index.ts';

const pos = new Vector3(-3, 10, 4);
const TARGETS = [
  [2, 3, 9],
  [-7, 18, -1],
  [0, 4, -12],
  [5, 30, 4],
] as const;

function turn(axis: Vector3, angle: number): Quaternion {
  return new Quaternion().setFromAxisAngle(axis.normalize(), angle);
}

describe('tilt-only bar with a rotation (G2)', () => {
  const bar = { pos, T: TYPES.bar, mount: 'hang' as const };

  it('keeps pan at 0 and finds the tilt again in its own turned Y-Z plane', () => {
    const rotations = [
      turn(new Vector3(0, 1, 0), Math.PI / 2),
      turn(new Vector3(1, 1, 0), 2.5),
      new Quaternion(1, 0, 0, 0),
    ];
    for (const rotation of rotations) {
      for (let tilt = -90; tilt <= 90; tilt += 15) {
        const f = { ...bar, rotation };
        const { x, y, z } = dirFrom(f, 0, tilt, new Vector3()).multiplyScalar(6).add(pos);
        const aim = aimAt(f, x, y, z);
        expect([aim.pan, Math.abs(aim.tilt - tilt) <= 0.05]).toEqual([0, true]);
      }
    }
  });

  it('aims like a floor bar when its floor pose is a half turn about Z, for any target', () => {
    const floorBar = { ...bar, mount: 'floor' as const };
    const turned = { ...bar, rotation: new Quaternion(0, 0, 1, 0) };
    for (const [x, y, z] of TARGETS) {
      expect(aimAt(turned, x, y, z)).toEqual(aimAt(floorBar, x, y, z));
    }
  });

  it('ignores a floor mount on a rotated bar, also on a half turn about Z', () => {
    for (const rotation of [turn(new Vector3(0, 0, 1), 0.7), new Quaternion(0, 0, 1, 0)]) {
      const hang = { ...bar, rotation };
      const floor = { ...bar, mount: 'floor' as const, rotation };
      for (const [x, y, z] of TARGETS) expect(aimAt(floor, x, y, z)).toEqual(aimAt(hang, x, y, z));
    }
  });
});
