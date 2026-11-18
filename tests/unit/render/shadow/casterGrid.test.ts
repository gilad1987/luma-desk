import { describe, expect, it } from 'vitest';
import { binTriangles } from '../../../../src/render/shadow/casterGrid';
import { mergedBoxes } from './casterShapes';

describe('binTriangles', () => {
  it('sorts the triangles by cell and gives each cell its run and its box', () => {
    const position = mergedBoxes().getAttribute('position');
    const { index, runs } = binTriangles(position, (corner) => corner, 24, 4);
    expect(runs.map((run) => run.count).reduce((sum, count) => sum + count, 0)).toBe(72);
    expect([...index].sort((a, b) => a - b)).toEqual(Array.from({ length: 72 }, (_, i) => i));
    for (const { start, count, box } of runs) {
      const xs = [...index.subarray(start, start + count)].map((vertex) => position.getX(vertex));
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(box[0] ?? NaN);
      expect(Math.max(...xs)).toBeLessThanOrEqual(box[3] ?? NaN);
      // a run holds one box only: its triangles are 1 m wide, not 41
      expect((box[3] ?? 0) - (box[0] ?? 0)).toBeLessThanOrEqual(1);
    }
  });
});
