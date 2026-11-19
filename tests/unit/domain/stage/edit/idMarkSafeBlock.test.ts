/**
 * The promise behind the `nextFixtureId` bound (review #8): a mark that would give unsafe ids through the id block
 * round-up of `nextIdBlock` is rejected at parse, unless a fixture id of the design is higher (an MVR import keeps its
 * FixtureIDs); a design the parser accepts still adds fixtures with safe, unique ids, and a stored fixture id near
 * `Number.MAX_SAFE_INTEGER` makes an add refuse with a RangeError instead of repeating ids.
 */
import { describe, expect, it } from 'vitest';
import { addFloorRow } from '../../../../../src/domain/stage/edit/addFixtures.ts';
import { MAX_ID_MARK } from '../../../../../src/domain/stage/edit/ids.ts';
import { deleteFixtures } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { parseStageDesign } from '../../../../../src/domain/stage/parse/parseStageDesign.ts';
import { sampleDesign } from './sampleDesign.ts';

const ROW = { type: 'par', count: 3, from: [-2, 1, 3], to: [2, 1, 3] } as const;

/** The parse of the sample design saved with `nextFixtureId` set to `mark`. */
const parseWithMark = (mark: number) =>
  parseStageDesign({ ...JSON.parse(JSON.stringify(sampleDesign())), nextFixtureId: mark });

describe('the id mark near Number.MAX_SAFE_INTEGER', () => {
  it.each([Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 50, MAX_ID_MARK + 1])('rejects the mark %s', (mark) => {
    const parsed = parseWithMark(mark);
    expect(parsed.ok ? [] : parsed.errors).toEqual([`nextFixtureId: expected at most ${MAX_ID_MARK}, got ${mark}`]);
  });

  it('adds safe, unique ids after the largest accepted mark', () => {
    const parsed = parseWithMark(MAX_ID_MARK);
    if (!parsed.ok) throw new Error(`the parser rejected the mark: ${parsed.errors.join('; ')}`);
    const ids = addFloorRow(parsed.design, ROW).fixtures.map((f) => f.id);
    expect(ids.filter((id) => !Number.isSafeInteger(id))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(-3)).toEqual([MAX_ID_MARK + 1, MAX_ID_MARK + 2, MAX_ID_MARK + 3]);
  });

  it('loads a delete on a design with a fixture id above MAX_ID_MARK, and rejects a mark above that id + 1', () => {
    const d = sampleDesign();
    const imported = { ...d, fixtures: d.fixtures.map((f, i) => (i === 0 ? { ...f, id: 2e9 } : f)) };
    const saved = JSON.parse(JSON.stringify(deleteFixtures(imported, [301]))) as Record<string, unknown>;
    const parsed = parseStageDesign(saved);
    expect(parsed.ok && parsed.design.nextFixtureId).toBe(2e9 + 1);
    const above = parseStageDesign({ ...saved, nextFixtureId: 2e9 + 2 });
    expect(above.ok ? [] : above.errors).toEqual(['nextFixtureId: expected at most 2000000001, got 2000000002']);
  });

  it('refuses an add after a fixture id near Number.MAX_SAFE_INTEGER instead of repeating ids', () => {
    const d = sampleDesign();
    const top = Number.MAX_SAFE_INTEGER - 50;
    const high = { ...d, fixtures: d.fixtures.map((f, i) => (i === 0 ? { ...f, id: top } : f)) };
    expect(() => addFloorRow(high, ROW)).toThrow(RangeError);
  });
});
