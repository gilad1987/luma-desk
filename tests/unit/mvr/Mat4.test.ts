import { describe, expect, it } from 'vitest';
import { identity, multiply, readMvrMatrix, transformPoint } from '../../../src/mvr/math/Mat4.ts';
import { mvrMatrix } from '../../shared/index.ts';

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** A 90 degree turn about Z (x to y) with a translation, written as MVR does. */
const TURN_AND_MOVE = '{0,1,0}{-1,0,0}{0,0,1}{1000,2000,3000}';

describe('identity', () => {
  it('is the 4x4 identity', () => {
    expect([...identity()]).toEqual(IDENTITY);
  });
});

describe('readMvrMatrix text forms', () => {
  it('reads {u}{v}{w}{o} as basis columns u, v, w and translation o, column-major', () => {
    const m = mvrMatrix('{1,2,3}{4,5,6}{7,8,9}{10,11,12}');
    expect([...m]).toEqual([1, 2, 3, 0, 4, 5, 6, 0, 7, 8, 9, 0, 10, 11, 12, 1]);
  });

  it('keeps millimetres and the Z-up frame', () => {
    expect(transformPoint(mvrMatrix(TURN_AND_MOVE), [10, 0, 0])).toEqual([1000, 2010, 3000]);
  });

  it('allows spaces, signs and exponents', () => {
    const m = mvrMatrix(' { 1 , 0 , 0 } {0,1,0}\n{0,0,1} {-1.5e3, +2, 0.25} ');
    expect([m[12], m[13], m[14]]).toEqual([-1500, 2, 0.25]);
  });

  it.each([
    ['three groups', '{1,0,0}{0,1,0}{0,0,1}'],
    ['five groups', '{1,0,0}{0,1,0}{0,0,1}{0,0,0}{0,0,0}'],
    ['two numbers in a group', '{1,0}{0,1,0}{0,0,1}{0,0,0}'],
    ['an empty number', '{1,,0}{0,1,0}{0,0,1}{0,0,0}'],
    ['a word', '{1,0,0}{0,1,0}{0,0,1}{a,0,0}'],
    ['an infinite number', '{1,0,0}{0,1,0}{0,0,1}{Infinity,0,0}'],
  ])('gives undefined when the matrix is %s', (_label, text) => {
    expect(readMvrMatrix(text)).toBeUndefined();
  });
});

describe('multiply', () => {
  it('leaves a matrix unchanged when either side is identity', () => {
    const m = mvrMatrix(TURN_AND_MOVE);
    expect(multiply(identity(), m)).toEqual(m);
    expect(multiply(m, identity())).toEqual(m);
  });

  it('applies the right matrix first, as a parent world times a child local', () => {
    const parent = mvrMatrix(TURN_AND_MOVE);
    const child = mvrMatrix('{1,0,0}{0,1,0}{0,0,1}{100,0,0}');
    const world = multiply(parent, child);
    expect(transformPoint(world, [0, 0, 0])).toEqual(transformPoint(parent, transformPoint(child, [0, 0, 0])));
    expect(transformPoint(world, [0, 0, 0])).toEqual([1000, 2100, 3000]);
  });

  it('does not change its inputs', () => {
    const a = mvrMatrix(TURN_AND_MOVE);
    const before = [...a];
    multiply(a, a);
    expect([...a]).toEqual(before);
  });
});

describe('readMvrMatrix', () => {
  it('reads exponent forms as official exports write them', () => {
    const m = readMvrMatrix('{1e-05,0,0}{0,1E+03,0}{0,0,1.000000e+00}{0,0,0}');
    expect([m?.[0], m?.[5], m?.[10]]).toEqual([1e-5, 1000, 1]);
  });

  it('gives identity for missing or blank text and undefined for text that does not parse', () => {
    expect([...(readMvrMatrix(undefined) ?? [])]).toEqual([...identity()]);
    expect([...(readMvrMatrix('  ') ?? [])]).toEqual([...identity()]);
    expect(readMvrMatrix('{1,0,0}{0,1,0}{0,0,1}')).toBeUndefined();
    expect(readMvrMatrix('{1,0,0}{0,1,0}{0,0,1}{x,0,0}')).toBeUndefined();
  });
});
