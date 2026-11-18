/**
 * The inverse axis math of the export: a design pose written as MVR matrix text must read back through the import's
 * own `mvrMatrix`, `toThree`, `pointToThree` and `quaternionOf` to the same pose. A swapped axis or a flipped
 * sign in `fromThree`, `composeMatrix` or `formatMvrMatrix` moves or turns every exported fixture.
 */
import { describe, expect, it } from 'vitest';
import type { Quat, Vec3 } from '../../../../src/domain/stage/types.ts';
import { mountOf } from '../../../../src/mvr/design/assignRole.ts';
import { pointToThree, quaternionOf, toThree } from '../../../../src/mvr/math/axes.ts';
import { transformPoint } from '../../../../src/mvr/math/Mat4.ts';
import { poseMatrix } from '../../../../src/mvr/export/poseMatrix.ts';
import { mvrMatrix } from '../../../shared/index.ts';

/** The angle in degrees between two unit quaternions; q and -q are the same rotation. */
function angleBetween(a: Quat, b: Quat): number {
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return (2 * Math.acos(Math.min(1, dot)) * 180) / Math.PI;
}

/** A unit quaternion for a turn of `degrees` about `axis`. */
function turn(axis: Vec3, degrees: number): Quat {
  const half = (degrees * Math.PI) / 360;
  const length = Math.hypot(...axis);
  const s = Math.sin(half) / length;
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(half)];
}

/** Reads a written pose back the way the import does: world position in metres and the body quaternion. */
function readBack(text: string): { position: Vec3; rotation: Quat; mount: string } {
  const matrix = mvrMatrix(text);
  return {
    position: pointToThree(transformPoint(matrix, [0, 0, 0])),
    rotation: quaternionOf(toThree(matrix)),
    mount: mountOf(matrix),
  };
}

const POSES: readonly (readonly [string, Vec3, Quat, string])[] = [
  ['a hanging fixture at rest', [3.25, 7.5, -2.125], [0, 0, 0, 1], 'hang'],
  ['a floor fixture turned over', [-4.2, 1.22, -7.5], [1, 0, 0, 0], 'floor'],
  ['a rotated ring fixture', [12.345678, 9.87, 0.004], turn([0.3, 0.8, -0.5], 137), 'hang'],
  ['a fixture yawed and tilted', [-0.0004, 0, 25], turn([1, 2, 3], 33.3), 'hang'],
];

describe('poseMatrix', () => {
  it.each(POSES)('reads back %s within 1 mm and 0.1 degrees', (_name, position, rotation, mount) => {
    const back = readBack(poseMatrix(position, rotation, [0, 0, 0]));
    const offsets = back.position.map((value, axis) => Math.abs(value - (position[axis] ?? 0)));
    expect([Math.max(...offsets) < 0.001, angleBetween(back.rotation, rotation) < 0.1, back.mount]).toEqual([
      true,
      true,
      mount,
    ]);
  });

  it('writes MVR millimetres with Z up: three (1, 2, 3) m is MVR (1000, -3000, 2000) mm', () => {
    expect(poseMatrix([1, 2, 3], [0, 0, 0, 1], [0, 0, 0])).toBe('{1,0,0}{0,1,0}{0,0,1}{1000,-3000,2000}');
  });

  it('takes the fit offset off, so an imported fixture goes back to its file position', () => {
    expect(poseMatrix([1.5, 2, 3], [0, 0, 0, 1], [0.5, 1, 1])).toBe('{1,0,0}{0,1,0}{0,0,1}{1000,-2000,1000}');
  });
});
