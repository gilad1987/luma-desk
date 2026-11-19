// @vitest-environment jsdom
/**
 * Pan and tilt ranges come from the channel functions of the GDTF mode, with the sign the maker wrote, the byte
 * resolution and the home value. A range that is not a real one is dropped with its reason. Products are invented.
 */
import { describe, expect, it } from 'vitest';
import { gdtfFunctionMode, opticsOf } from '../../shared/index.ts';

const PAN_16 = 'DMXFrom="0/2" Default="32768/2" PhysicalFrom="-270" PhysicalTo="270"';
const TILT_8 = 'DMXFrom="0/1" Default="128/1" PhysicalFrom="135" PhysicalTo="-135"';
const mode = (pan: string, tilt = TILT_8): string =>
  gdtfFunctionMode('Std', [
    { attribute: 'Pan', offset: '1,2', fn: pan },
    { attribute: 'Tilt', offset: '3', fn: tilt },
    { attribute: 'Dimmer', offset: '4' },
  ]);

describe('pan and tilt from a GDTF', () => {
  it('reads the range, the 16-bit and 8-bit DMX slots and the home value', () => {
    const { optics, drops } = opticsOf({ modes: mode(PAN_16) });
    expect(optics?.pan).toMatchObject({ attribute: 'Pan', from: -270, to: 270, dmxFrom: 0, dmxTo: 65535 });
    expect(optics?.pan?.drives).toEqual([{ dmxBreak: 1, offset: [1, 2] }]);
    expect(optics?.pan?.home).toBeCloseTo(0, 1);
    expect(optics?.tilt).toMatchObject({ from: 135, to: -135, dmxFrom: 0, dmxTo: 255 });
    expect(optics?.tilt?.drives).toEqual([{ dmxBreak: 1, offset: [3] }]);
    expect(optics?.tilt?.home).toBeCloseTo(135 - (128 / 255) * 270, 6);
    expect(optics?.dimmer).toEqual({
      attribute: 'Dimmer',
      drives: [{ dmxBreak: 1, offset: [4] }],
      dmxFrom: 0,
      dmxTo: 255,
    });
    expect(drops).toEqual([]);
  });

  it('keeps the opposite sign convention of another maker', () => {
    const { optics } = opticsOf({ modes: mode('PhysicalFrom="270" PhysicalTo="-270"') });
    expect(optics?.pan).toMatchObject({ from: 270, to: -270 });
    expect(optics?.pan?.home).toBeUndefined();
  });

  it.each([
    ['the GDTF default 0 to 1', 'PhysicalFrom="0" PhysicalTo="1"', 'noRange'],
    ['no physical values', '', 'missing'],
    ['a range under 90 degrees', 'PhysicalFrom="-30" PhysicalTo="30"', 'tooSmall'],
  ] as const)('drops a pan range with %s', (_name, pan, reason) => {
    const { optics, drops } = opticsOf({ modes: mode(pan) });
    expect(optics?.pan).toBeUndefined();
    expect(optics?.tilt?.from).toBe(135);
    expect(drops).toEqual([{ part: 'pan', reason }]);
  });

  it('drops a tilt range of 0 to 1 and gives nothing for an unknown mode', () => {
    const modes = mode(PAN_16, 'PhysicalFrom="0" PhysicalTo="1"');
    expect(opticsOf({ modes }).drops).toEqual([{ part: 'tilt', reason: 'noRange' }]);
    expect(opticsOf({ modes }, 'Other')).toEqual({ drops: [] });
  });
});
