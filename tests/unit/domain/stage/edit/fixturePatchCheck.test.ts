/**
 * Owns the input checks of `setFixtureProps` (rules P6, P7): every design it returns passes the show parser, and a
 * patch that would make one the parser refuses throws a RangeError naming the field and value. The no-change and
 * change sides of a valid patch are owned by noOps.test.ts and propsPatch.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { MOUNTS, type Mount } from '../../../../../src/domain/Fixture.ts';
import type { FixtureTypeId } from '../../../../../src/domain/FixtureType.ts';
import { setFixtureProps, type FixturePatch } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { setLedWall } from '../../../../../src/domain/stage/edit/ledWall.ts';
import { parseStageDesign } from '../../../../../src/domain/stage/parse/parseStageDesign.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { FIXTURE_ROLES, type FixtureRole } from '../../../../../src/domain/stage/types.ts';
import { jsonRoundTrip } from '../../../../shared/index.ts';
import { sampleDesign } from './sampleDesign.ts';

/** The sample with an LED wall, and the id of the 'screen' fixture that drives it. */
function withWall(): { readonly d: StageDesign; readonly wallId: number } {
  const d = setLedWall(sampleDesign(), { width: 8, height: 4 });
  const wallId = d.screens[0]?.fixtureId;
  if (wallId === undefined) throw new Error('setLedWall added no screen');
  return { d, wallId };
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

/** The type system refuses these values; a panel `<select>` value can still carry one at runtime. */
const UNKNOWN_TYPE = 'laser' as FixtureTypeId;
const UNKNOWN_ROLE = 'spot' as FixtureRole;
const UNKNOWN_MOUNT = 'ceiling' as Mount;

const BAD: readonly (readonly [string, FixturePatch, string])[] = [
  ['NaN position', { position: [Number.NaN, 7, 0] }, 'position must be finite, got [NaN, 7, 0]'],
  ['infinite rotation', { rotation: [0, 0, Infinity, 1] }, 'rotation must be finite, got [0, 0, Infinity, 1]'],
  ['NaN pan', { fixed: { pan: Number.NaN, tilt: 0 } }, 'fixed must be finite, got [NaN, 0]'],
  ['unknown truss', { trussId: 'gone-1' }, 'trussId must name a truss, got gone-1'],
  ['zero-length rotation', { rotation: [0, 0, 0, 0] }, 'rotation must be longer than 0.000001, got [0, 0, 0, 0]'],
  ['NaN pixel start', { pixel: { ...STRIP, p: [Number.NaN, 7, 0] } }, 'pixel.p must be finite, got [NaN, 7, 0]'],
  [
    'infinite pixel tangent',
    { pixel: { ...STRIP, tan: [1, Infinity, 0] } },
    'pixel.tan must be finite, got [1, Infinity, 0]',
  ],
  ['NaN pixel length', { pixel: { ...STRIP, len: Number.NaN } }, 'pixel.len must be finite, got [NaN]'],
  ['unknown type', { type: UNKNOWN_TYPE }, 'type must be a known fixture type, got laser'],
  ['unknown role', { role: UNKNOWN_ROLE }, `role must be one of ${FIXTURE_ROLES.join(', ')}, got spot`],
  ['unknown mount', { mount: UNKNOWN_MOUNT }, `mount must be one of ${MOUNTS.join(', ')}, got ceiling`],
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
  it.each(BAD)('refuses a %s, naming the field and value', (_, patch, message) => {
    const run = (): StageDesign => setFixtureProps(sampleDesign(), 101, patch);
    expect(run).toThrow(RangeError);
    expect(run).toThrow(`setFixtureProps: ${message}`);
  });

  it('refuses a new type for the fixture an LED wall points at', () => {
    const { d, wallId } = withWall();
    const run = (): StageDesign => setFixtureProps(d, wallId, { type: 'wash' });
    expect(run).toThrow(RangeError);
    expect(run).toThrow(`setFixtureProps: type of LED wall fixture ${wallId} must stay screen, got wash`);
  });

  it('refuses a new type for a screen fixture that no wall points at yet', () => {
    const { d, wallId } = withWall();
    const run = (): StageDesign => setFixtureProps({ ...d, screens: [] }, wallId, { type: 'par' });
    expect(run).toThrow(`setFixtureProps: type of LED wall fixture ${wallId} must stay screen, got par`);
  });
});
