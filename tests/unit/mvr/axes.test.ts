import { describe, expect, it } from 'vitest';
import type { Quat } from '../../../src/domain/stage/types.ts';
import { boxFromThree, boxToThree, pointToThree, quaternionOf, toThree } from '../../../src/mvr/math/axes.ts';
import { transformPoint } from '../../../src/mvr/math/Mat4.ts';
import { mvrMatrix } from '../../shared/index.ts';

type V = readonly [number, number, number];

/** `v` turned by the unit quaternion `q` (v + 2w(q×v) + 2q×(q×v)). */
function rotate([x, y, z, w]: Quat, v: V): V {
  const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const c = cross([x, y, z], v);
  const t: V = [c[0] * 2, c[1] * 2, c[2] * 2];
  const u = cross([x, y, z], t);
  return [v[0] + w * t[0] + u[0], v[1] + w * t[1] + u[1], v[2] + w * t[2] + u[2]];
}

const close = (actual: readonly number[], expected: readonly number[]): void => {
  expected.forEach((value, i) => expect(actual[i]).toBeCloseTo(value, 9));
};

/** The hanging rest beam of the desk: straight down. */
const REST_BEAM: V = [0, -1, 0];

/** MVR rotX(90°): the local -Z beam turns to MVR +Y. */
const TILT_X90 = '{1,0,0}{0,0,1}{0,-1,0}{1000,2000,3000}';

describe('pointToThree', () => {
  it('turns MVR millimetres, Z up, into three metres, Y up', () => {
    close(pointToThree([1000, 2000, 3000]), [1, 3, -2]);
  });
});

describe('toThree', () => {
  it('moves the translation into the three frame in metres', () => {
    const m = toThree(mvrMatrix('{1,0,0}{0,1,0}{0,0,1}{1000,2000,3000}'));
    close([m[12] ?? NaN, m[13] ?? NaN, m[14] ?? NaN], [1, 3, -2]);
  });

  it('commutes with the point conversion', () => {
    const m = mvrMatrix(TILT_X90);
    close(transformPoint(toThree(m), pointToThree([10, 20, 30])), pointToThree(transformPoint(m, [10, 20, 30])));
  });
});

describe('quaternionOf', () => {
  it('gives the identity for an unrotated fixture, so its beam hangs straight down', () => {
    close(quaternionOf(toThree(mvrMatrix(undefined))), [0, 0, 0, 1]);
  });

  it('points a fixture tilted 90° about MVR X upstage (MVR +Y is three -Z)', () => {
    const q = quaternionOf(toThree(mvrMatrix(TILT_X90)));
    close(rotate(q, REST_BEAM), [0, 0, -1]);
  });

  it('points a fixture turned upside down in MVR straight up', () => {
    const q = quaternionOf(toThree(mvrMatrix('{1,0,0}{0,-1,0}{0,0,-1}{0,0,0}')));
    close(rotate(q, REST_BEAM), [0, 1, 0]);
  });

  it('ignores scale and returns a unit quaternion', () => {
    const plain = quaternionOf(toThree(mvrMatrix(TILT_X90)));
    const scaled = quaternionOf(toThree(mvrMatrix('{2,0,0}{0,0,3}{0,-0.5,0}{0,0,0}')));
    close(scaled, plain);
    expect(Math.hypot(...scaled)).toBeCloseTo(1, 12);
  });

  it('gives the identity for a degenerate matrix', () => {
    expect(quaternionOf(mvrMatrix('{0,0,0}{0,1,0}{0,0,1}{0,0,0}'))).toEqual([0, 0, 0, 1]);
  });
});

describe('box conversion', () => {
  it('converts an MVR box to three and back', () => {
    const box = { min: [0, -3000, 0], max: [1000, 0, 2000] } as const;
    const three = boxToThree(box);
    close([...three.min, ...three.max], [0, 0, 0, 1, 2, 3]);
    const back = boxFromThree(three);
    close([...back.min, ...back.max], [...box.min, ...box.max]);
  });
});
