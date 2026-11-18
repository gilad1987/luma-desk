/**
 * Owns the reference rule of a stored `mvr` block: each `mvr.fixtures` key must name a fixture of the design, as a
 * `trussId` must name a truss, because a reused fixture id would take over an orphan entry's MVR identity.
 */
import { describe, expect, it } from 'vitest';
import { parseStageDesign } from '../../../../src/domain/stage/parse/parseStageDesign.ts';
import { SAMPLE } from './parseSample.ts';

const INFO = { uuid: 'U', layer: 'L', gdtfName: 'G', gdtfMode: 'M', type: 'spot' };

/** The sample design with an `mvr` block whose fixture entries have the keys `keys`. */
function withEntries(keys: readonly string[]): unknown {
  const fixtures = Object.fromEntries(keys.map((key) => [key, INFO]));
  return { ...SAMPLE, mvr: { fixtures, layers: [], hiddenLayers: [], offset: [0, 0, 0] } };
}

describe('parseStageDesign: mvr fixture references', () => {
  it('reads entries whose keys are fixture ids of the design', () => {
    const result = parseStageDesign(withEntries(['1', '2']));
    expect(result.ok && Object.keys(result.design.mvr?.fixtures ?? {})).toEqual(['1', '2']);
  });

  it('rejects an entry for a fixture the design does not have', () => {
    expect(parseStageDesign(withEntries(['1', '99']))).toEqual({
      ok: false,
      errors: ['mvr.fixtures.99: no fixture has id 99'],
    });
  });
});
