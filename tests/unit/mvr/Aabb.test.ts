import { describe, expect, it } from 'vitest';
import { emptyBox, isEmpty, isFiniteBox, pointBox, shiftBox, transformBox, union } from '../../../src/mvr/math/Aabb.ts';
import { mvrMatrix } from '../../shared/index.ts';

const BOX = { min: [0, 0, 0], max: [1, 2, 3] } as const;

describe('Aabb', () => {
  it('starts empty, and union with the empty box changes nothing', () => {
    expect(isEmpty(emptyBox())).toBe(true);
    expect(union(emptyBox(), BOX)).toEqual(BOX);
    expect(isEmpty(BOX)).toBe(false);
  });

  it('tells finite boxes from boxes holding NaN or infinity', () => {
    expect([isFiniteBox(BOX), isFiniteBox(emptyBox())]).toEqual([true, false]);
    expect(isFiniteBox({ min: [0, NaN, 0], max: [1, 1, 1] })).toBe(false);
  });

  it('unions boxes and points', () => {
    expect(union(BOX, pointBox([-1, 5, 1]))).toEqual({ min: [-1, 0, 0], max: [1, 5, 3] });
  });

  it('moves all 8 corners through a rotation and translation', () => {
    const turnZ90 = mvrMatrix('{0,1,0}{-1,0,0}{0,0,1}{10,20,30}');
    expect(transformBox(BOX, turnZ90)).toEqual({ min: [8, 20, 30], max: [10, 21, 33] });
  });

  it('keeps an empty box empty under a transform', () => {
    expect(isEmpty(transformBox(emptyBox(), mvrMatrix(undefined)))).toBe(true);
  });

  it('shifts a box without turning it', () => {
    expect(shiftBox(BOX, [1, -1, 2])).toEqual({ min: [1, -1, 2], max: [2, 1, 5] });
  });
});
