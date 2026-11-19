/**
 * The float noise tolerance (1e-6 m) of the truss size limits in `parseStageDesign`, at both ends and for every size
 * kind: noise inside it passes, a size just past it fails. The limits themselves are owned by parseTrussLimits.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { errorsOf, SAMPLE } from './parseSample.ts';

const RANGE = 'expected a size from 0.1 to 60 m, got';

/** The sample design with the params of truss `index` changed by `patch`. */
function withParams(index: number, patch: Record<string, unknown>): unknown {
  const trusses = SAMPLE.trusses.map((t, i) => (i === index ? { ...t, params: { ...t.params, ...patch } } : t));
  return { ...SAMPLE, trusses };
}

describe('parseStageDesign truss size tolerance', () => {
  it('accepts noise inside the tolerance on a line, a section, a radius, a width and a height', () => {
    const line = withParams(0, { a: [0, 0, 0], b: [60 + 5e-7, 0, 0], section: 0.1 - 5e-7 });
    expect(errorsOf(line)).toStrictEqual([]);
    expect(errorsOf(withParams(1, { radius: 60 + 9e-7, section: 0.1 - 9e-7 }))).toStrictEqual([]);
    expect(errorsOf(withParams(2, { width: 60 + 9e-7, height: 0.1 - 9e-7 }))).toStrictEqual([]);
  });

  it.each<[string, unknown, string]>([
    ['a line just over 60 m', withParams(0, { a: [0, 0, 0], b: [60.00001, 0, 0] }), 'trusses[0].params.b'],
    ['a section just under 0.1 m', withParams(0, { section: 0.09999 }), 'trusses[0].params.section'],
    ['a radius just over 60 m', withParams(1, { radius: 60 + 2e-6 }), 'trusses[1].params.radius'],
    ['a goalpost height just under 0.1 m', withParams(2, { height: 0.1 - 2e-6 }), 'trusses[2].params.height'],
  ])('rejects %s', (_, stage, path) => {
    const errors = errorsOf(stage);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(`${path}: ${RANGE}`);
  });
});
