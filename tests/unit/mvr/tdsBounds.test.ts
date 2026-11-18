import { describe, expect, it } from 'vitest';
import { tdsBounds } from '../../../src/mvr/mesh/tdsBounds.ts';
import { make3ds } from '../../shared/index.ts';

describe('tdsBounds', () => {
  it('reads the vertex min/max of one object', () => {
    const bytes = make3ds([
      [0, -500, 0],
      [1000, 500, 250],
    ]);
    expect(tdsBounds(bytes)).toEqual({ min: [0, -500, 0], max: [1000, 500, 250] });
  });

  it('unions every object of the file', () => {
    const bytes = make3ds([[0, 0, 0]], [[-10, 20, 30]]);
    expect(tdsBounds(bytes)).toEqual({ min: [-10, 0, 0], max: [0, 20, 30] });
  });

  it('gives undefined for a file without vertices or bytes that are not 3DS', () => {
    expect(tdsBounds(make3ds())).toBeUndefined();
    expect(tdsBounds(new Uint8Array([0x4d, 0x4d, 0xff, 0xff, 0xff, 0x7f, 0]))).toBeUndefined();
  });

  it('skips a NaN or infinite vertex instead of spreading it into the box', () => {
    const bytes = make3ds([
      [0, 0, 0],
      [NaN, 1000, 1000],
      [2000, Infinity, 2000],
      [10, 20, 30],
    ]);
    expect(tdsBounds(bytes)).toEqual({ min: [0, 0, 0], max: [10, 20, 30] });
  });

  it('stops at a chunk whose length runs past the end', () => {
    const bytes = make3ds([[1, 2, 3]]).slice(0, -4);
    expect(() => tdsBounds(bytes)).not.toThrow();
  });
});
