// @vitest-environment jsdom
/**
 * The trust rule for optical data, and the summary lines made from its verdicts: a maker's file is used, a
 * Vectorworks `Custom@` stand-in and a generic mode are not, and every fixture is counted in exactly one line.
 */
import { describe, expect, it } from 'vitest';
import { TYPES } from '../../../src/domain/fixtureTypes/index.ts';
import type { GdtfInfo } from '../../../src/mvr/gdtf/GdtfInfo.ts';
import { readGdtf } from '../../../src/mvr/gdtf/readGdtf.ts';
import { fixtureOptics } from '../../../src/mvr/import/fixtureOptics.ts';
import { opticsLines, type OpticsEntry } from '../../../src/mvr/import/opticsLines.ts';
import { gdtfFunctionMode, makeGdtf, OPTICS_REAL_MODE } from '../../shared/index.ts';

const read = (file: string, modes: string): GdtfInfo | undefined => readGdtf(makeGdtf({ modes }), file).info;
const RANGES = 'PhysicalFrom="-270" PhysicalTo="270"';
const GENERIC = gdtfFunctionMode('Std', [
  { attribute: 'Dimmer', offset: '1' },
  { attribute: 'Pan', offset: '2', fn: RANGES },
]);
const SMALL_PAN = OPTICS_REAL_MODE.replace('PhysicalFrom="-270" PhysicalTo="270"', 'PhysicalFrom="0" PhysicalTo="1"');
const real = fixtureOptics(read('Acme@Nova.gdtf', OPTICS_REAL_MODE), 'Acme@Nova', 'Std');
const custom = fixtureOptics(read('Custom@Thing.gdtf', OPTICS_REAL_MODE), 'Custom@Thing', 'Std');
const smallPan = fixtureOptics(read('Acme@Nova.gdtf', SMALL_PAN), 'Acme@Nova', 'Std');

describe('fixtureOptics', () => {
  it('uses a maker file with a real channel set', () => {
    expect(real.reason).toBeUndefined();
    expect(real.optics?.pan).toMatchObject({ from: -270, to: 270 });
    expect(real.optics?.gobos).toBeUndefined();
  });

  it('does not use a Custom@ stand-in, a generic mode, a missing file or a file without optical facts', () => {
    expect(custom).toEqual({ reason: 'vendorSymbol', drops: [] });
    expect(fixtureOptics(read('Acme@Stub.gdtf', GENERIC), 'Acme@Stub', 'Std')).toEqual({
      reason: 'generic',
      drops: [],
    });
    expect(fixtureOptics(undefined, 'Ghost@None', 'Std')).toEqual({ reason: 'noGdtf', drops: [] });
    const control = gdtfFunctionMode('Std', [{ attribute: 'Control1', offset: '1' }]);
    expect(fixtureOptics(read('Acme@Box.gdtf', control), 'Acme@Box', 'Std')).toEqual({ reason: 'noData', drops: [] });
  });

  it('keeps the rest of a trusted file when one range is a placeholder', () => {
    expect(smallPan.optics?.pan).toBeUndefined();
    expect(smallPan.optics?.tilt).toMatchObject({ from: 135, to: -135 });
    expect(smallPan.drops).toEqual([{ part: 'pan', reason: 'noRange' }]);
  });
});

describe('opticsLines', () => {
  const entry = (
    product: string,
    verdict: OpticsEntry['verdict'],
    type: OpticsEntry['type'] = 'spot',
  ): OpticsEntry => ({
    product,
    type,
    verdict,
  });
  const nova = entry('Nova Spot', real);
  const thing = entry('Thing', custom, 'profile');
  const lines = opticsLines([nova, thing, nova, entry('Nova Spot', smallPan), thing, nova]);

  it('groups by product and outcome, and the counts add up to the fixture count', () => {
    expect(lines.map((line) => [line.product, line.count, line.reason, line.parts])).toEqual([
      ['Nova Spot', 3, undefined, ['panTilt']],
      ['Thing', 2, 'vendorSymbol', []],
      ['Nova Spot', 1, undefined, ['panTilt']],
    ]);
    expect(lines.reduce((sum, line) => sum + line.count, 0)).toBe(6);
  });

  it('words each line in English', () => {
    const spot = TYPES.spot.name;
    expect(lines.map((line) => line.message)).toEqual([
      '3 fixtures of "Nova Spot": pan/tilt comes from the GDTF.',
      `2 fixtures of "Thing": the GDTF is a CAD stand-in with no trustworthy optical data; desk defaults for type ${TYPES.profile.name} are used.`,
      `1 fixture of "Nova Spot": pan/tilt comes from the GDTF; not used: pan range (no real range); desk defaults for type ${spot} are used for the rest.`,
    ]);
  });
});
