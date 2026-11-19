/**
 * The seat area is plain data of the design: the import writes one optional box, and every design the import emits
 * reads back from a saved show with no error. A show saved before the field existed reads unchanged.
 */
import { describe, expect, it } from 'vitest';
import { parseMvrInfo } from '../../../src/domain/stage/parse/parseMvrInfo.ts';
import { Reader } from '../../../src/domain/stage/parse/readers.ts';
import type { ResolvedFixture } from '../../../src/mvr/design/DesignInput.ts';
import { toStageDesign } from '../../../src/mvr/design/toStageDesign.ts';
import { makeFixtureRecord, makeScene, seatRows, wallGrid } from '../../shared/index.ts';

const fixture = (uuid: string, x: number, y: number): ResolvedFixture => ({
  record: makeFixtureRecord({ uuid, matrix: `{1,0,0}{0,1,0}{0,0,1}{${x},${y},6000}`, layer: 'l1' }),
  type: 'spot',
  gdtfName: 'Spot',
  mode: 'Std',
});
const FIXTURES = [fixture('a', -4000, 4000), fixture('b', 4000, 4000), fixture('c', -4000, -4000)];
const SEAT = { symdef: 'S2', layer: 'L2' };

/** The `mvr` block of a design as a saved show holds it, read back; the parsed block and the reader's errors. */
function reread(mvr: unknown): [unknown, readonly string[]] {
  const r = new Reader();
  return [parseMvrInfo(r, { mvr: JSON.parse(JSON.stringify(mvr)) as object }, 'mvr', ''), r.errors];
}

const designOf = (perRow: number, rows: number, pitch: number) =>
  toStageDesign({
    name: 'Show.mvr',
    scene: makeScene({ proxies: [...seatRows(perRow, rows, pitch, SEAT), ...wallGrid(3, 3, 500, { symdef: 'S1' })] }),
    fixtures: FIXTURES,
    meshBoxes: new Map(),
  }).design;

describe('the seat area of an imported design', () => {
  it('is the box around the seats in stage metres, and absent for a file without seats', () => {
    const seats = designOf(8, 3, 540).mvr?.seatArea;
    if (!seats) throw new Error('no seat area');
    const size = seats.max.map((value, i) => value - (seats.min[i] ?? 0));
    // 8 seats 0.54 m apart, 3 rows 0.95 m apart that rise 0.15 m each
    expect(size[0]).toBeCloseTo(7 * 0.54);
    expect(size[1]).toBeCloseTo(2 * 0.15);
    expect(size[2]).toBeCloseTo(2 * 0.95);
    const bare = toStageDesign({ name: 'Bare.mvr', scene: makeScene(), fixtures: FIXTURES, meshBoxes: new Map() });
    expect(bare.design.mvr).toBeDefined();
    expect(bare.design.mvr && 'seatArea' in bare.design.mvr).toBe(false);
  });

  it('reads every design the import emits back with no error (40 seat plans)', () => {
    for (let seed = 0; seed < 40; seed++) {
      const [perRow, rows, pitch] = [4 + (seed % 9), 2 + (seed % 5), 450 + 25 * (seed % 7)];
      const { mvr } = designOf(perRow, rows, pitch);
      const [parsed, errors] = reread(mvr);
      expect(errors, `seed ${seed}`).toEqual([]);
      expect(parsed, `seed ${seed}`).toEqual(JSON.parse(JSON.stringify(mvr)));
      expect(mvr?.seatArea?.min.every(Number.isFinite)).toBe(true);
    }
  });

  it('reads a show saved before the field existed unchanged, and reports a broken box', () => {
    const old = { fixtures: {}, layers: [], hiddenLayers: [], offset: [0, 0, 0] };
    expect(reread(old)).toEqual([old, []]);
    const [, errors] = reread({ ...old, seatArea: { min: [0, 0, 0], max: [1, 'x', 2] } });
    expect(errors.some((error) => error.startsWith('mvr.seatArea.max'))).toBe(true);
  });
});
