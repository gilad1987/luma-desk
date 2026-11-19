/**
 * Edge cases of the `nextFixtureId` mark that idReuse.test.ts does not reach: a delete on an MVR import keeps both
 * the `mvr` block (minus the deleted entries) and the mark, and the parser refuses a saved mark that is not a
 * positive integer, so a damaged file cannot make a new batch reuse or skip ids.
 */
import { describe, expect, it } from 'vitest';
import { addFloorRow } from '../../../../../src/domain/stage/edit/addFixtures.ts';
import { deleteFixtures } from '../../../../../src/domain/stage/edit/itemOps.ts';
import type { MvrFixtureInfo } from '../../../../../src/domain/stage/mvr.ts';
import { parseStageDesign } from '../../../../../src/domain/stage/parse/parseStageDesign.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { sampleDesign } from './sampleDesign.ts';

const ROW = { type: 'par', count: 2, from: [-2, 1, 3], to: [2, 1, 3] } as const;

/** `d` with an `mvr.fixtures` entry per fixture and one layer, as an MVR import leaves it. */
function imported(d: StageDesign): StageDesign {
  const info = (id: number): MvrFixtureInfo => ({
    uuid: `U-${id}`,
    layer: 'L',
    gdtfName: 'G',
    gdtfMode: 'M',
    type: 'wash',
  });
  const fixtures = Object.fromEntries(d.fixtures.map((f) => [String(f.id), info(f.id)]));
  return { ...d, mvr: { fixtures, layers: [{ uuid: 'L', name: 'Layer' }], hiddenLayers: [], offset: [1, 2, 3] } };
}

/** The errors of parsing `d` saved as JSON with `nextFixtureId` set to `mark`. */
function markErrors(d: StageDesign, mark: unknown): readonly string[] {
  const parsed = parseStageDesign({ ...JSON.parse(JSON.stringify(d)), nextFixtureId: mark });
  return parsed.ok ? [] : parsed.errors;
}

describe('deleteFixtures on an MVR import', () => {
  it('keeps the mvr block minus the deleted entry, and stores the mark above the deleted top id', () => {
    const before = imported(sampleDesign());
    const after = deleteFixtures(before, [301]);
    expect(Object.keys(after.mvr?.fixtures ?? {})).toEqual(['101', '102', '201']);
    expect({ ...after.mvr, fixtures: {} }).toEqual({ ...before.mvr, fixtures: {} });
    expect(after.nextFixtureId).toBe(302);
    expect(
      addFloorRow(after, ROW)
        .fixtures.slice(-2)
        .map((f) => f.id),
    ).toEqual([401, 402]);
  });

  it('survives a save and load with both the mvr block and the mark', () => {
    const parsed = parseStageDesign(JSON.parse(JSON.stringify(deleteFixtures(imported(sampleDesign()), [301]))));
    if (!parsed.ok) throw new Error(parsed.errors.join('\n'));
    expect(parsed.design.nextFixtureId).toBe(302);
    expect(Object.keys(parsed.design.mvr?.fixtures ?? {})).toEqual(['101', '102', '201']);
  });
});

describe('parseStageDesign nextFixtureId', () => {
  it.each([0, -5, 1.5, '302', null, Number.NaN, 1e20, Number.MAX_SAFE_INTEGER + 1])('rejects the mark %s', (mark) => {
    expect(markErrors(sampleDesign(), mark)).toHaveLength(1);
    expect(markErrors(sampleDesign(), mark)[0]).toMatch(/^nextFixtureId: /);
  });

  it('names an unsafe mark as such, and accepts Number.MAX_SAFE_INTEGER itself', () => {
    expect(markErrors(sampleDesign(), 1e20)).toEqual([
      'nextFixtureId: expected a safe integer, got 100000000000000000000',
    ]);
    expect(markErrors(sampleDesign(), Number.MAX_SAFE_INTEGER)).toEqual([]);
  });

  it('accepts a mark at or below the highest id, and a new batch still starts above the highest id', () => {
    const parsed = parseStageDesign({ ...JSON.parse(JSON.stringify(sampleDesign())), nextFixtureId: 1 });
    if (!parsed.ok) throw new Error(parsed.errors.join('\n'));
    expect(
      addFloorRow(parsed.design, ROW)
        .fixtures.slice(-2)
        .map((f) => f.id),
    ).toEqual([401, 402]);
  });
});
