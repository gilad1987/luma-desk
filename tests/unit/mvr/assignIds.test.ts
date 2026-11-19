import { describe, expect, it } from 'vitest';
import { assignIds } from '../../../src/mvr/design/assignIds.ts';
import type { MvrWarning } from '../../../src/mvr/MvrWarning.ts';
import { makeFixtureRecord } from '../../shared/index.ts';

function ids(...records: ReturnType<typeof makeFixtureRecord>[]): { ids: number[]; warnings: MvrWarning[] } {
  const warnings: MvrWarning[] = [];
  return { ids: assignIds(records, (w) => warnings.push(w)), warnings };
}

describe('assignIds', () => {
  it('prefers FixtureIDNumeric, then a numeric FixtureID', () => {
    const result = ids(
      makeFixtureRecord({ fixtureIdNumeric: 7, fixtureId: '99' }),
      makeFixtureRecord({ fixtureId: ' 12 ' }),
    );
    expect(result.ids).toEqual([7, 12]);
    expect(result.warnings).toEqual([]);
  });

  it('gives the lowest free id to records without a usable id, after reserving requested ids', () => {
    const result = ids(
      makeFixtureRecord({ fixtureId: 'A12' }),
      makeFixtureRecord({ fixtureIdNumeric: 0 }),
      makeFixtureRecord({ fixtureIdNumeric: 1 }),
      makeFixtureRecord({ fixtureId: '3' }),
    );
    expect(result.ids).toEqual([2, 4, 1, 3]);
  });

  it('gives a duplicate a new id and a `duplicate-id` warning, keeping the first in file order', () => {
    const result = ids(
      makeFixtureRecord({ uuid: 'a', fixtureIdNumeric: 5 }),
      makeFixtureRecord({ uuid: 'b', fixtureIdNumeric: 5 }),
      makeFixtureRecord({ uuid: 'c', fixtureId: '1' }),
    );
    expect(result.ids).toEqual([5, 2, 1]);
    expect(result.warnings.map((w) => [w.code, w.ref])).toEqual([['duplicate-id', 'b']]);
  });

  it('gives an auto id to a FixtureID or FixtureIDNumeric that is not a safe integer, and keeps the fixture', () => {
    const result = ids(
      makeFixtureRecord({ fixtureId: '12345678901234567890' }),
      makeFixtureRecord({ fixtureIdNumeric: Number.MAX_SAFE_INTEGER + 1 }),
      makeFixtureRecord({ fixtureIdNumeric: Number.MAX_SAFE_INTEGER }),
    );
    expect(result.ids).toEqual([1, 2, Number.MAX_SAFE_INTEGER]);
  });
});
