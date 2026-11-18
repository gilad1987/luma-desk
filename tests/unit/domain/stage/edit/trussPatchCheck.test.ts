/**
 * Owns the input checks of `setTrussProps` (rules P6, P7): every design it returns passes the show parser, and a
 * patch the parser would refuse throws a RangeError with the parser's own errors. Each refused row also proves the
 * parser refuses the same truss, so the check is never stricter than the parser. The no-change and change sides of a
 * valid patch are owned by noOps.test.ts and propsPatch.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { setTrussProps, type TrussPatch } from '../../../../../src/domain/stage/edit/trussOps.ts';
import { parseStageDesign } from '../../../../../src/domain/stage/parse/parseStageDesign.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import type { TrussMaterial, TrussParams } from '../../../../../src/domain/stage/trussTypes.ts';
import type { FixtureRole } from '../../../../../src/domain/stage/types.ts';
import { jsonRoundTrip } from '../../../../shared/index.ts';
import { PIPE, sampleDesign } from './sampleDesign.ts';

const LINE = { kind: 'straight', a: [-5, 0, 0], b: [5, 0, 0], section: 0.3 } as const satisfies TrussParams;
const RING = { kind: 'circle', radius: 4, section: 0.3 } as const satisfies TrussParams;
const GOAL = { kind: 'goalpost', width: 8, height: 6, section: 0.4 } as const satisfies TrussParams;
const PART = { size: [1, 0.1, 1], at: [0, 0, 0], material: 'dark' } as const;

/** The type system refuses these values; a panel `<select>` value can still carry one at runtime. */
const UNKNOWN_ROLE = 'spot' as FixtureRole;
const UNKNOWN_MATERIAL = 'chrome' as TrussMaterial;
const UNKNOWN_KIND: TrussParams = { ...GOAL, kind: 'dome' as typeof GOAL.kind };

const VALID: readonly (readonly [string, TrussPatch])[] = [
  ['a new name and role', { name: 'Front pipe', role: 'side' }],
  ['a line with chains and a part', { params: { ...LINE, section: 0.5, chains: [[-5, 0, 0]], parts: [PART] } }],
  ['a tower', { params: { ...LINE, kind: 'tower', b: [0, 6, 0] } }],
  ['a ring with chains', { params: { ...RING, chains: { count: 6, phase: 0.5 } } }],
  ['a goalpost', { params: GOAL }],
  ['a roof', { params: { kind: 'roof', size: [10, 0.5, 8] } }],
];

const POSITIVE = 'expected a number greater than 0, got';
const FINITE = 'expected a finite number, got';
const COUNT = 'expected a positive integer, got';

/** The pipe is `trusses[0]` of the sample, so every row has one path prefix; patchErrorIndex.test.ts covers others. */
const BAD: readonly (readonly [string, TrussPatch, string])[] = [
  ['zero line section', { params: { ...LINE, section: 0 } }, `params.section: ${POSITIVE} 0`],
  ['NaN line end a', { params: { ...LINE, a: [Number.NaN, 0, 0] } }, `params.a[0]: ${FINITE} NaN`],
  ['infinite line end b', { params: { ...LINE, b: [5, Infinity, 0] } }, `params.b[1]: ${FINITE} Infinity`],
  ['NaN chain point', { params: { ...LINE, chains: [[0, Number.NaN, 0]] } }, `params.chains[0][1]: ${FINITE} NaN`],
  [
    'flat part',
    { params: { ...LINE, parts: [{ ...PART, size: [1, 0, 1] }] } },
    `params.parts[0].size[1]: ${POSITIVE} 0`,
  ],
  [
    'NaN part spot',
    { params: { ...LINE, parts: [{ ...PART, at: [0, 0, Number.NaN] }] } },
    `params.parts[0].at[2]: ${FINITE} NaN`,
  ],
  [
    'part of unknown material',
    { params: { ...LINE, parts: [{ ...PART, material: UNKNOWN_MATERIAL }] } },
    'params.parts[0].material: unknown material "chrome"',
  ],
  ['negative radius', { params: { ...RING, radius: -1 } }, `params.radius: ${POSITIVE} -1`],
  ['NaN ring section', { params: { ...RING, section: Number.NaN } }, `params.section: ${POSITIVE} NaN`],
  [
    'fractional chain count',
    { params: { ...RING, chains: { count: 2.5, phase: 0 } } },
    `params.chains.count: ${COUNT} 2.5`,
  ],
  ['zero chain count', { params: { ...RING, chains: { count: 0, phase: 0 } } }, `params.chains.count: ${COUNT} 0`],
  [
    'NaN chain phase',
    { params: { ...RING, chains: { count: 4, phase: Number.NaN } } },
    `params.chains.phase: ${FINITE} NaN`,
  ],
  ['zero goalpost width', { params: { ...GOAL, width: 0 } }, `params.width: ${POSITIVE} 0`],
  ['infinite goalpost height', { params: { ...GOAL, height: Infinity } }, `params.height: ${POSITIVE} Infinity`],
  ['negative goalpost section', { params: { ...GOAL, section: -0.4 } }, `params.section: ${POSITIVE} -0.4`],
  ['flat roof', { params: { kind: 'roof', size: [10, 0, 8] } }, `params.size[1]: ${POSITIVE} 0`],
  ['unknown params kind', { params: UNKNOWN_KIND }, 'params.kind: unknown truss kind "dome"'],
  ['unknown role', { role: UNKNOWN_ROLE }, 'role: unknown role "spot"'],
];

describe('setTrussProps returns only designs the parser accepts', () => {
  it.each(VALID)('keeps the design parseable after %s', (_, patch) => {
    const next = setTrussProps(sampleDesign(), PIPE.id, patch);
    expect(parseStageDesign(jsonRoundTrip(next))).toEqual({ ok: true, design: next });
  });
});

describe('setTrussProps refuses a patch the parser would refuse', () => {
  it.each(BAD)('refuses a %s with the parser error, and the parser refuses it too', (_, patch, error) => {
    const run = (): StageDesign => setTrussProps(sampleDesign(), PIPE.id, patch);
    expect(run).toThrow(RangeError);
    expect(run).toThrow(`setTrussProps: trusses[0].${error}`);
    const d = sampleDesign();
    const bad = { ...d, trusses: d.trusses.map((t) => (t.id === PIPE.id ? { ...t, ...patch } : t)) };
    expect(parseStageDesign(bad)).toEqual({ ok: false, errors: [`trusses[0].${error}`] });
  });
});
