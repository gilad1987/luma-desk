/**
 * Owns the error path of `setFixtureProps` and `setTrussProps` for an item that is not first in its list: each op
 * reads the whole patched list with the parser, so its error is the parser's error with the item's real index, word
 * for word. The other refused patches are owned by fixturePatchCheck.test.ts and trussPatchCheck.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { setFixtureProps } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { setTrussProps } from '../../../../../src/domain/stage/edit/trussOps.ts';
import { parseStageDesign } from '../../../../../src/domain/stage/parse/parseStageDesign.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { LEFT_TOWER, patchedFixture, sampleDesign } from './sampleDesign.ts';

const FINITE = 'expected a finite number, got';
const POSITIVE = 'expected a number greater than 0, got';

describe('setFixtureProps and setTrussProps name the real index of the refused item', () => {
  it('reports fixture 301 at fixtures[3], as the parser does', () => {
    const patch = { position: [Number.NaN, 1, 3] } as const;
    const error = `fixtures[3].position[0]: ${FINITE} NaN`;
    expect(parseStageDesign(patchedFixture(sampleDesign(), 301, patch))).toEqual({ ok: false, errors: [error] });
    const run = (): StageDesign => setFixtureProps(sampleDesign(), 301, patch);
    expect(run).toThrow(new RangeError(`setFixtureProps: ${error}`));
  });

  it('reports the left tower at trusses[1], as the parser does', () => {
    const d = sampleDesign();
    const params = { ...LEFT_TOWER.params, section: 0 };
    const error = `trusses[1].params.section: ${POSITIVE} 0`;
    const bad = { ...d, trusses: d.trusses.map((t) => (t.id === LEFT_TOWER.id ? { ...t, params } : t)) };
    expect(parseStageDesign(bad)).toEqual({ ok: false, errors: [error] });
    const run = (): StageDesign => setTrussProps(d, LEFT_TOWER.id, { params });
    expect(run).toThrow(new RangeError(`setTrussProps: ${error}`));
  });
});
