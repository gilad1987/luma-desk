import { describe, expect, it } from 'vitest';
import { inverseSquareIntegral, rayApex } from '../../../../src/render/photometry';
import { expectWithin, midpoint } from './within';

describe('closed form of the inverse square integral', () => {
  it('equals the numeric integral of 1 / (h^2 + (t + b)^2) and the textbook arc tangent form', () => {
    for (const [h, b, t0, t1] of [
      [2, -0.3, 0, 0.6],
      [0.01, -5, 0, 12],
      [3, 4, 1, 40],
    ] as const) {
      const numeric = midpoint((t) => 1 / (h * h + (t + b) * (t + b)), t0, t1, 400_000);
      expectWithin(inverseSquareIntegral(h, b, t0, t1), numeric, 1e-6);
      const textbook = (Math.atan((t1 + b) / h) - Math.atan((t0 + b) / h)) / h;
      expectWithin(inverseSquareIntegral(h, b, t0, t1), textbook, 1e-9);
    }
  });

  it('stays finite for a ray through the apex and tends to 1 / u0 - 1 / u1 beside it', () => {
    expect(inverseSquareIntegral(0, 1, 0, 1)).toBeCloseTo(1 / 1 - 1 / 2, 9);
    expect(Number.isFinite(inverseSquareIntegral(0, -1, 0, 2))).toBe(true);
    expect(inverseSquareIntegral(2, 0, 3, 3)).toBe(0);
  });

  it('finds h and b of a ray against the apex', () => {
    const { height, offset } = rayApex([-0.3, 3, 0], [1, 0, 0], [0, 5, 0]);
    expect(height).toBeCloseTo(2, 12);
    expect(offset).toBeCloseTo(-0.3, 12);
    // a ray that starts at the apex
    expect(rayApex([0, 5, 0], [1, 0, 0], [0, 5, 0])).toEqual({ height: 0, offset: 0 });
  });
});
