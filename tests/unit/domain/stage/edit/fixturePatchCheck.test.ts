/**
 * Owns the input checks of `setFixtureProps` (rules P6, P7): a patch the parser would refuse throws the parser's own
 * errors, and each refused row proves the parser refuses the same fixture. The screen fixture type rule is owned by
 * screenFixtureType.test.ts. Valid patches are also owned by noOps.test.ts and propsPatch.test.ts.
 */
import { describe, expect, it } from 'vitest';
import type { Mount } from '../../../../../src/domain/Fixture.ts';
import type { FixtureTypeId } from '../../../../../src/domain/FixtureType.ts';
import { setFixtureProps, type FixturePatch } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { parseStageDesign } from '../../../../../src/domain/stage/parse/parseStageDesign.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import type { FixtureRole } from '../../../../../src/domain/stage/types.ts';
import { jsonRoundTrip } from '../../../../shared/index.ts';
import { patchedFixture, sampleDesign } from './sampleDesign.ts';

const STRIP = { p: [-3, 7, 0], tan: [1, 0, 0], len: 2 } as const;

const VALID: readonly (readonly [string, FixturePatch])[] = [
  ['a new position', { position: [1, 6.5, -0.5] }],
  ['a rotation', { rotation: [0, 0, 0.6, 0.8] }],
  ['fixed angles', { fixed: { pan: 0.5, tilt: -0.2 } }],
  ['a move to another truss', { trussId: 'left-1' }],
  ['a move off the truss', { trussId: null, mount: 'floor' }],
  ['a new type and role', { type: 'beam', role: 'side' }],
  ['a pixel strip', { pixel: STRIP }],
];

const FINITE = 'expected a finite number, got';

/**
 * Fixture 101 is `fixtures[0]` of the sample, so every row has one path prefix; patchErrorIndex.test.ts covers others. The last three rows
 * carry values the type system refuses; a panel `<select>` value can still carry one at runtime.
 */
const BAD: readonly (readonly [string, FixturePatch, string])[] = [
  ['NaN position', { position: [Number.NaN, 7, 0] }, `position[0]: ${FINITE} NaN`],
  ['infinite rotation', { rotation: [0, 0, Infinity, 1] }, `rotation[2]: ${FINITE} Infinity`],
  ['NaN pan', { fixed: { pan: Number.NaN, tilt: 0 } }, `fixed.pan: ${FINITE} NaN`],
  ['unknown truss', { trussId: 'gone-1' }, 'trussId: unknown truss "gone-1"'],
  ['limit-length rotation', { rotation: [0, 0, 0, 1e-6] }, 'rotation: zero-length quaternion [0, 0, 0, 0.000001]'],
  ['NaN pixel start', { pixel: { ...STRIP, p: [Number.NaN, 7, 0] } }, `pixel.p[0]: ${FINITE} NaN`],
  ['infinite pixel tangent', { pixel: { ...STRIP, tan: [1, Infinity, 0] } }, `pixel.tan[1]: ${FINITE} Infinity`],
  ['NaN pixel length', { pixel: { ...STRIP, len: Number.NaN } }, `pixel.len: ${FINITE} NaN`],
  ['unknown type', { type: 'laser' as FixtureTypeId }, 'type: unknown type "laser"'],
  ['unknown role', { role: 'spot' as FixtureRole }, 'role: unknown role "spot"'],
  ['unknown mount', { mount: 'ceiling' as Mount }, 'mount: unknown mount "ceiling"'],
];

describe('setFixtureProps returns only designs the parser accepts', () => {
  it.each(VALID)('keeps the design parseable after %s', (_, patch) => {
    const next = setFixtureProps(sampleDesign(), 101, patch);
    expect(parseStageDesign(jsonRoundTrip(next))).toEqual({ ok: true, design: next });
  });

  it('stores a non-unit rotation normalized, as the next show load reads it', () => {
    const next = setFixtureProps(sampleDesign(), 101, { rotation: [0, 0, 3, 4] });
    expect(next.fixtures[0]?.rotation).toEqual([0, 0, 0.6, 0.8]);
    expect(parseStageDesign(jsonRoundTrip(next))).toEqual({ ok: true, design: next });
  });
});

describe('setFixtureProps refuses a patch the parser would refuse', () => {
  it.each(BAD)('refuses a %s with the parser error, and the parser refuses it too', (_, patch, error) => {
    const run = (): StageDesign => setFixtureProps(sampleDesign(), 101, patch);
    expect(run).toThrow(RangeError);
    expect(run).toThrow(`setFixtureProps: fixtures[0].${error}`);
    const refused = { ok: false, errors: [`fixtures[0].${error}`] };
    expect(parseStageDesign(patchedFixture(sampleDesign(), 101, patch))).toEqual(refused);
  });
});
