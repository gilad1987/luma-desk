/**
 * The promise behind the id rules (review #8): fixture ids are safe integers, and the parser loads any mark up to 2^53
 * (the highest safe id + 1), as an MVR import keeps its FixtureIDs and a delete there stores a high mark. A mark or a
 * fixture id near `Number.MAX_SAFE_INTEGER` makes the next add refuse with a RangeError (`nextIdBlock` checks the
 * whole batch), so ids never repeat.
 */
import { describe, expect, it } from 'vitest';
import { addFloorRow } from '../../../../../src/domain/stage/edit/addFixtures.ts';
import { deleteFixtures } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { parseStageDesign } from '../../../../../src/domain/stage/parse/parseStageDesign.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { sampleDesign } from './sampleDesign.ts';

const ROW = { type: 'par', count: 3, from: [-2, 1, 3], to: [2, 1, 3] } as const;

/** The parse of the sample design saved with `nextFixtureId` set to `mark`. */
const parseWithMark = (mark: number) =>
  parseStageDesign({ ...JSON.parse(JSON.stringify(sampleDesign())), nextFixtureId: mark });

/** The sample design with its first fixture id set to `id`, as an MVR import may number it. */
function withFirstId(id: number): StageDesign {
  const d = sampleDesign();
  return { ...d, fixtures: d.fixtures.map((f, i) => (i === 0 ? { ...f, id } : f)) };
}

describe('the id mark near Number.MAX_SAFE_INTEGER', () => {
  it('loads a mark up to 2^53 (the highest safe id + 1) and rejects one above it', () => {
    const errorsOf = (mark: number) => {
      const parsed = parseWithMark(mark);
      return parsed.ok ? [] : parsed.errors;
    };
    const marks = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 3, 1e20];
    expect(marks.map(errorsOf)).toEqual([
      [],
      [],
      ['nextFixtureId: expected a positive integer up to 2^53, got 9007199254740994'],
      ['nextFixtureId: expected a positive integer up to 2^53, got 100000000000000000000'],
    ]);
  });

  it.each([Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER - 50])('refuses the next add after mark %s', (mark) => {
    const parsed = parseWithMark(mark);
    if (!parsed.ok) throw new Error(`the parser rejected the mark: ${parsed.errors.join('; ')}`);
    expect(() => addFloorRow(parsed.design, ROW)).toThrow(RangeError);
  });

  it.each([2e9, 301])('saves and loads a delete of fixture %s on a design with the fixture id 2e9', (deleted) => {
    const saved: unknown = JSON.parse(JSON.stringify(deleteFixtures(withFirstId(2e9), [deleted])));
    const parsed = parseStageDesign(saved);
    expect(parsed.ok && parsed.design.nextFixtureId).toBe(2e9 + 1);
  });

  it('saves and loads a delete next to the fixture id MAX_SAFE_INTEGER - 1, whose mark is MAX_SAFE_INTEGER', () => {
    const top = Number.MAX_SAFE_INTEGER - 1;
    const parsed = parseStageDesign(JSON.parse(JSON.stringify(deleteFixtures(withFirstId(top), [301]))));
    expect(parsed.ok && parsed.design.nextFixtureId).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('rejects a fixture id of 1e20 at parse', () => {
    const parsed = parseStageDesign(JSON.parse(JSON.stringify(withFirstId(1e20))));
    expect(parsed.ok ? [] : parsed.errors).toContain(
      'fixtures[0].id: expected a positive safe integer, got 100000000000000000000',
    );
  });

  it('refuses an add after a fixture id near Number.MAX_SAFE_INTEGER instead of repeating ids', () => {
    expect(() => addFloorRow(withFirstId(Number.MAX_SAFE_INTEGER - 50), ROW)).toThrow(RangeError);
  });
});
