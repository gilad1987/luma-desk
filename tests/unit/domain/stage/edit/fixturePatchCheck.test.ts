/**
 * Owns the input checks of `setFixtureProps` (rules P6, P7): a patch the parser would refuse throws the parser's own
 * errors, and each refused row proves the parser refuses the same fixture. The one stricter rule is the screen fixture
 * product rule, marked below. Valid patches are also owned by noOps.test.ts and propsPatch.test.ts.
 */
import { describe, expect, it } from 'vitest';
import type { Mount } from '../../../../../src/domain/Fixture.ts';
import type { FixtureTypeId } from '../../../../../src/domain/FixtureType.ts';
import { setFixtureProps, type FixturePatch } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { setLedWall } from '../../../../../src/domain/stage/edit/ledWall.ts';
import { parseStageDesign } from '../../../../../src/domain/stage/parse/parseStageDesign.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import type { FixtureRole } from '../../../../../src/domain/stage/types.ts';
import { jsonRoundTrip } from '../../../../shared/index.ts';
import { sampleDesign } from './sampleDesign.ts';

/** The sample with an LED wall, and the id of the 'screen' fixture that drives it. */
function withWall(): { readonly d: StageDesign; readonly wallId: number } {
  const d = setLedWall(sampleDesign(), { width: 8, height: 4 });
  const wallId = d.screens[0]?.fixtureId;
  if (wallId === undefined) throw new Error('setLedWall added no screen');
  return { d, wallId };
}

/** `d` with the patch written straight into fixture `id`, past the op's check, as a hand-edited show would hold it. */
function patched(d: StageDesign, id: number, patch: FixturePatch): StageDesign {
  return { ...d, fixtures: d.fixtures.map((f) => (f.id === id ? { ...f, ...patch } : f)) };
}

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
 * Fixture 101 is `fixtures[0]` of the sample, so the parser error path is the one the op reports. The last three rows
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

  it('keeps the design parseable after the LED wall fixture moves and keeps its type', () => {
    const { d, wallId } = withWall();
    const next = setFixtureProps(d, wallId, { type: 'screen', position: [0, 5, -3] });
    expect(parseStageDesign(jsonRoundTrip(next))).toEqual({ ok: true, design: next });
  });
});

describe('setFixtureProps refuses a patch the parser would refuse', () => {
  it.each(BAD)('refuses a %s with the parser error, and the parser refuses it too', (_, patch, error) => {
    const run = (): StageDesign => setFixtureProps(sampleDesign(), 101, patch);
    expect(run).toThrow(RangeError);
    expect(run).toThrow(`setFixtureProps: fixtures[0].${error}`);
    const refused = { ok: false, errors: [`fixtures[0].${error}`] };
    expect(parseStageDesign(patched(sampleDesign(), 101, patch))).toEqual(refused);
  });

  it('refuses a new type for the fixture an LED wall points at, as the parser screen rule does', () => {
    const { d, wallId } = withWall();
    const run = (): StageDesign => setFixtureProps(d, wallId, { type: 'wash' });
    expect(run).toThrow(`setFixtureProps: type of LED wall fixture ${wallId} must stay screen, got wash`);
    const refused = { ok: false, errors: [`screens[0].fixtureId: ${wallId} is not a fixture of type "screen"`] };
    expect(parseStageDesign(patched(d, wallId, { type: 'wash' }))).toEqual(refused);
  });
});

describe('setFixtureProps keeps the type of a screen fixture (product rule, stricter than the parser)', () => {
  it('refuses a new type for a screen fixture that no wall points at yet, which the parser accepts', () => {
    const { d, wallId } = withWall();
    const run = (): StageDesign => setFixtureProps({ ...d, screens: [] }, wallId, { type: 'par' });
    expect(run).toThrow(`setFixtureProps: type of LED wall fixture ${wallId} must stay screen, got par`);
    expect(parseStageDesign(patched({ ...d, screens: [] }, wallId, { type: 'par' }))).toMatchObject({ ok: true });
  });
});
