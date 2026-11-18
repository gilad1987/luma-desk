import { describe, expect, it } from 'vitest';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { withPoints } from '../../../../src/render/mvr/proxyPoints';

const box: StageBounds = { min: [-1, 0, -1], max: [1, 2, 1] };

describe('withPoints', () => {
  it('grows the box to hold finite points', () => {
    expect(withPoints(box, [[5, -1, 0]])).toEqual({ min: [-1, -1, -1], max: [5, 2, 1] });
  });

  it('leaves out a point that is not finite', () => {
    const broken = [
      [NaN, 0, 0],
      [0, Infinity, 0],
      [0, 0, -Infinity],
    ] as const;
    expect(withPoints(box, [...broken, [0, 3, 0]])).toEqual({ min: [-1, 0, -1], max: [1, 3, 1] });
  });
});
