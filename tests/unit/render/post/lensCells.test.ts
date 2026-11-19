import { describe, expect, it } from 'vitest';
import { withLensCells } from '../../../../src/render/fixtures/lens/shapeLens';
import { LENS_PEAK } from '../../../../src/render/post/emitters';
import { LENS_CAP } from '../../../../src/render/post/lensBound';
import { cellRadiance, cellShape, faceMoments, BODY_POWER, CORE_POWER } from '../../../../src/render/post/lensCells';
import { BLOOM, toBufferUnits } from '../../../../src/render/post/mvrTone';

/** A face like the ones the desk draws: cells with a white middle that fades to 0.69, a rib or ring between them. */
const RIB = 0.33;
const CELL = 0.69;
const FACE = Array.from({ length: 1000 }, (_, i) => {
  if (i % 5 === 0) return RIB;
  const inCell = (i % 50) / 50;
  return inCell < 0.2 ? 1 - inCell * 1.55 : CELL;
});
const MOMENTS = faceMoments(FACE) ?? { mean: 1, body: 1, core: 1 };

/** The radiance of a white texel under the one bound per material, at a dimmer level 0..1 (`boundedLensGain`). */
function flatAt(level: number): number {
  const cap = toBufferUnits(LENS_CAP);
  return cap * (1 - Math.exp((-level * toBufferUnits(LENS_PEAK)) / cap));
}

const LEVELS = [0.1, 0.5, 1];

describe('the radiance bound per texel of a lens face', () => {
  it('grows with the texel and with the level', () => {
    let last = -1;
    for (const level of [0.02, 0.1, 0.25, 0.5, 0.75, 1]) {
      const flat = flatAt(level);
      const shape = cellShape(flat, MOMENTS, { body: 0, core: 0 });
      const mid = cellRadiance(CELL, flat, shape);
      expect(mid).toBeGreaterThan(last);
      last = mid;
      for (let t = 0.05; t <= 1; t += 0.05) {
        expect(cellRadiance(t, flat, shape)).toBeGreaterThan(cellRadiance(t - 0.05, flat, shape));
      }
    }
  });

  it.each(LEVELS)('keeps a rib darker than a cell and under white at level %f', (level) => {
    const flat = flatAt(level);
    const shape = cellShape(flat, MOMENTS, { body: 0, core: 0 });
    const rib = cellRadiance(RIB, flat, shape);
    // the flat law has a ratio of 2.1 and, at full, a rib three times over the white of a lit surface
    expect(cellRadiance(CELL, flat, shape) / rib).toBeGreaterThan(6);
    expect(rib).toBeLessThan(toBufferUnits(0.5));
  });

  it.each(LEVELS)('feeds the bloom the light of the flat bound at level %f, within 10 %%', (level) => {
    const flat = flatAt(level);
    const shape = cellShape(flat, MOMENTS, { body: 0, core: 0 });
    const cells = FACE.reduce((sum, t) => sum + cellRadiance(t, flat, shape), 0);
    const today = FACE.reduce((sum, t) => sum + t * flat, 0);
    expect(Math.abs(cells / today - 1)).toBeLessThan(0.1);
  });

  it('lets the hot core pass the bloom threshold from a tenth, and a dark lens has no law', () => {
    for (const level of LEVELS) {
      const flat = flatAt(level);
      const core = cellRadiance(1, flat, cellShape(flat, MOMENTS, { body: 0, core: 0 }));
      expect(core).toBeGreaterThan(toBufferUnits(BLOOM.threshold + BLOOM.knee));
    }
    expect(cellShape(0, MOMENTS, { body: 1, core: 1 })).toEqual({ body: 0, core: 0 });
    expect(faceMoments([0, 0, 0])).toBeUndefined();
  });

  it('is the law of the lens program: the same powers, after the face texel, with no clock', () => {
    const source = withLensCells('void main() {\n#include <map_fragment>\n}');
    expect(source.startsWith('uniform vec2 uLensCells;')).toBe(true);
    expect(source.indexOf('#include <map_fragment>')).toBeLessThan(source.indexOf('uLensCells.x * body'));
    expect([BODY_POWER, CORE_POWER]).toEqual([3, 12]);
    expect(source).toContain('float body = cell * cell * cell;');
    expect(source).toContain('float core = body * body * body * body;');
    expect(source).not.toMatch(/uTime|uFrame/);
  });
});
