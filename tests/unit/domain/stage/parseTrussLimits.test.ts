/**
 * Owns the truss size limits of `parseStageDesign`: a section, radius, width, height or line length outside 0.1-60 m
 * and more than 32 ring chains are errors, as the renderer draws a truss bay by bay and would never end. Every
 * template stays inside the limits. Sizes at or below zero are owned by `parseSizes.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { parseStageDesign } from '../../../../src/domain/stage/parse/parseStageDesign.ts';
import { createTemplate, TEMPLATE_IDS } from '../../../../src/domain/stage/templates/index.ts';
import { errorsOf, SAMPLE } from './parseSample.ts';

const RANGE = 'expected a size from 0.1 to 60 m, got';

/** The sample design with the params of truss `index` changed by `patch`. */
function withParams(index: number, patch: Record<string, unknown>): unknown {
  const trusses = SAMPLE.trusses.map((t, i) => (i === index ? { ...t, params: { ...t.params, ...patch } } : t));
  return { ...SAMPLE, trusses };
}

describe('parseStageDesign truss limits', () => {
  it.each<[string, unknown, string]>([
    ['a tiny straight section', withParams(0, { section: 1e-9 }), `trusses[0].params.section: ${RANGE} 1e-9`],
    ['a huge straight', withParams(0, { a: [-1e9, 0, 0], b: [1e9, 0, 0] }), `trusses[0].params.b: ${RANGE} 2000000000`],
    ['a tiny circle section', withParams(1, { section: 1e-4 }), `trusses[1].params.section: ${RANGE} 0.0001`],
    ['a huge circle radius', withParams(1, { radius: 1e9 }), `trusses[1].params.radius: ${RANGE} 1000000000`],
    ['a tiny goalpost section', withParams(2, { section: 0.05 }), `trusses[2].params.section: ${RANGE} 0.05`],
    ['a huge goalpost width', withParams(2, { width: 61 }), `trusses[2].params.width: ${RANGE} 61`],
    ['a huge tower', withParams(3, { b: [0, 100, 0] }), `trusses[3].params.b: ${RANGE} 100`],
  ])('rejects %s', (_, stage, error) => {
    expect(errorsOf(stage)).toStrictEqual([error]);
  });

  it('rejects more than 32 ring chains', () => {
    expect(errorsOf(withParams(1, { chains: { count: 1e9, phase: 0 } }))).toStrictEqual([
      'trusses[1].params.chains: expected at most 32 chains, got 1000000000',
    ]);
  });

  it('accepts the limits themselves', () => {
    const edges = withParams(1, { radius: 60, section: 0.1, chains: { count: 32, phase: 0 } });
    expect(errorsOf(withParams(0, { a: [-30, 0, 0], b: [30, 0, 0], section: 60 }))).toStrictEqual([]);
    expect(errorsOf(edges)).toStrictEqual([]);
  });

  it.each(TEMPLATE_IDS)('keeps the %s template inside the limits', (id) => {
    expect(parseStageDesign(JSON.parse(JSON.stringify(createTemplate(id)))).ok).toBe(true);
  });
});
