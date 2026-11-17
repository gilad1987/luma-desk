/**
 * Owns the input checks of `setTrussProps` (rules P6, P7): every design it returns passes the show parser, and params
 * the parser would refuse throw a RangeError naming the field and value. The no-change and change sides of a valid
 * patch are owned by noOps.test.ts and propsPatch.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { setTrussProps, type TrussPatch } from '../../../../../src/domain/stage/edit/trussOps.ts';
import { parseStageDesign } from '../../../../../src/domain/stage/parse/parseStageDesign.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import type { TrussParams } from '../../../../../src/domain/stage/trussTypes.ts';
import { jsonRoundTrip } from '../../../../shared/index.ts';
import { PIPE, sampleDesign } from './sampleDesign.ts';

const LINE = { kind: 'straight', a: [-5, 0, 0], b: [5, 0, 0], section: 0.3 } as const satisfies TrussParams;
const RING = { kind: 'circle', radius: 4, section: 0.3 } as const satisfies TrussParams;
const GOAL = { kind: 'goalpost', width: 8, height: 6, section: 0.4 } as const satisfies TrussParams;
const PART = { size: [1, 0.1, 1], at: [0, 0, 0], material: 'dark' } as const;

const VALID: readonly (readonly [string, TrussPatch])[] = [
  ['a new name and role', { name: 'Front pipe', role: 'side' }],
  ['a line with chains and a part', { params: { ...LINE, section: 0.5, chains: [[-5, 0, 0]], parts: [PART] } }],
  ['a tower', { params: { ...LINE, kind: 'tower', b: [0, 6, 0] } }],
  ['a ring with chains', { params: { ...RING, chains: { count: 6, phase: 0.5 } } }],
  ['a goalpost', { params: GOAL }],
  ['a roof', { params: { kind: 'roof', size: [10, 0.5, 8] } }],
];

const BAD: readonly (readonly [string, TrussParams, string])[] = [
  ['zero line section', { ...LINE, section: 0 }, 'section must be finite and > 0, got 0'],
  ['NaN line end a', { ...LINE, a: [Number.NaN, 0, 0] }, 'a must be finite, got [NaN, 0, 0]'],
  ['infinite line end b', { ...LINE, b: [5, Infinity, 0] }, 'b must be finite, got [5, Infinity, 0]'],
  ['NaN chain point', { ...LINE, chains: [[0, Number.NaN, 0]] }, 'chains[0] must be finite, got [0, NaN, 0]'],
  [
    'flat part',
    { ...LINE, parts: [{ ...PART, size: [1, 0, 1] }] },
    'parts[0].size must be finite and > 0, got 1 x 0 x 1',
  ],
  [
    'NaN part spot',
    { ...LINE, parts: [{ ...PART, at: [0, 0, Number.NaN] }] },
    'parts[0].at must be finite, got [0, 0, NaN]',
  ],
  ['negative radius', { ...RING, radius: -1 }, 'radius must be finite and > 0, got -1'],
  ['NaN ring section', { ...RING, section: Number.NaN }, 'section must be finite and > 0, got NaN'],
  [
    'fractional chain count',
    { ...RING, chains: { count: 2.5, phase: 0 } },
    'chains.count must be a positive integer, got 2.5',
  ],
  ['zero chain count', { ...RING, chains: { count: 0, phase: 0 } }, 'chains.count must be a positive integer, got 0'],
  ['NaN chain phase', { ...RING, chains: { count: 4, phase: Number.NaN } }, 'chains.phase must be finite, got [NaN]'],
  ['zero goalpost width', { ...GOAL, width: 0 }, 'width must be finite and > 0, got 0'],
  ['infinite goalpost height', { ...GOAL, height: Infinity }, 'height must be finite and > 0, got Infinity'],
  ['negative goalpost section', { ...GOAL, section: -0.4 }, 'section must be finite and > 0, got -0.4'],
  ['flat roof', { kind: 'roof', size: [10, 0, 8] }, 'size must be finite and > 0, got 10 x 0 x 8'],
];

describe('setTrussProps returns only designs the parser accepts', () => {
  it.each(VALID)('keeps the design parseable after %s', (_, patch) => {
    const next = setTrussProps(sampleDesign(), PIPE.id, patch);
    expect(parseStageDesign(jsonRoundTrip(next))).toEqual({ ok: true, design: next });
  });
});

describe('setTrussProps refuses params the parser would refuse', () => {
  it.each(BAD)('refuses a %s, naming the field and value', (_, params, message) => {
    const run = (): StageDesign => setTrussProps(sampleDesign(), PIPE.id, { params });
    expect(run).toThrow(RangeError);
    expect(run).toThrow(`setTrussProps: ${message}`);
  });
});
