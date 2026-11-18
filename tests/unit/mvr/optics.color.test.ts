// @vitest-environment jsdom
/**
 * The colour system of a GDTF mode: additive emitters with their colours, subtractive flags with their filters,
 * colour wheels with slot names, colours and DMX ranges, and colour temperature correction in kelvin.
 */
import { describe, expect, it } from 'vitest';
import { gdtfFunctionMode, opticsOf } from '../../shared/index.ts';

const PHYSICAL =
  '<Emitters><Emitter Name="Red" Color="0.64,0.33,21.26"/><Emitter Name="UV" DominantWaveLength="395"/></Emitters>' +
  '<Filters><Filter Name="Cyan" Color="0.2,0.3,60"/></Filters>';
const WHEELS =
  '<Wheel Name="Colors"><Slot Name="Open" Color="0.3127,0.3290,100"/><Slot Name="Fire" Color="0.64,0.33,21.26"/>' +
  '<Slot Name="Custom" Color="255.0,31.0,0.0"/></Wheel>';
const SETS =
  '<ChannelSet Name="Open" DMXFrom="0/1" WheelSlotIndex="1"/><ChannelSet Name="Fire" DMXFrom="10/1" WheelSlotIndex="2"/>';
const MODE = gdtfFunctionMode('Std', [
  { attribute: 'ColorAdd_R', offset: '1', fn: 'Emitter="Red"' },
  { attribute: 'ColorAdd_UV', offset: '2', fn: 'Emitter="UV"' },
  { attribute: 'ColorSub_C', offset: '3', fn: 'Filter="Cyan" PhysicalFrom="0" PhysicalTo="1"' },
  { attribute: 'Color1', offset: '4', fn: 'Wheel="Colors"', sets: SETS },
  { attribute: 'CTO', offset: '5', fn: 'PhysicalFrom="6700" PhysicalTo="2700"' },
  { attribute: 'CTB', offset: '6', fn: 'PhysicalFrom="0" PhysicalTo="1"' },
]);
const color = opticsOf({ physical: PHYSICAL, wheels: WHEELS, modes: MODE }).optics?.color;

describe('the colour system from a GDTF', () => {
  it('gives each additive emitter its colour, or its wavelength when it has no visible colour', () => {
    const [red, uv] = color?.emitters ?? [];
    expect(red).toMatchObject({ attribute: 'ColorAdd_R', name: 'Red', xyY: [0.64, 0.33, 21.26] });
    expect(red?.drives).toEqual([{ dmxBreak: 1, offset: [1] }]);
    red?.rgb?.forEach((part, index) => expect(part).toBeCloseTo(index === 0 ? 1 : 0, 2));
    expect(uv).toMatchObject({ attribute: 'ColorAdd_UV', name: 'UV', dominantWaveLength: 395 });
    expect(uv?.rgb).toBeUndefined();
  });

  it('gives each subtractive flag the colour of its filter', () => {
    expect(color?.filters).toHaveLength(1);
    expect(color?.filters?.[0]).toMatchObject({ attribute: 'ColorSub_C', name: 'Cyan', from: 0, to: 1 });
    expect(color?.filters?.[0]?.rgb?.[0]).toBeLessThan(color?.filters?.[0]?.rgb?.[2] ?? 0);
  });

  it('gives a colour wheel its slots with name, colour and the DMX range that selects each', () => {
    const wheel = color?.wheels?.[0];
    expect(wheel).toMatchObject({ attribute: 'Color1', name: 'Colors', drives: [{ dmxBreak: 1, offset: [4] }] });
    expect(wheel?.slots.map((slot) => [slot.name, slot.dmxFrom, slot.dmxTo])).toEqual([
      ['Open', 0, 9],
      ['Fire', 10, 255],
      ['Custom', undefined, undefined],
    ]);
    wheel?.slots[0]?.rgb?.forEach((part) => expect(part).toBeCloseTo(1, 2));
    expect(wheel?.slots[2]).toEqual({ name: 'Custom' });
  });

  it('reads a correction range in kelvin and leaves out a range that is not kelvin', () => {
    expect(color?.correction).toEqual([
      { attribute: 'CTO', drives: [{ dmxBreak: 1, offset: [5] }], dmxFrom: 0, dmxTo: 255, from: 6700, to: 2700 },
      { attribute: 'CTB', drives: [{ dmxBreak: 1, offset: [6] }], dmxFrom: 0, dmxTo: 255 },
    ]);
  });

  it('gives no colour system to a mode without one', () => {
    expect(
      opticsOf({ modes: gdtfFunctionMode('Std', [{ attribute: 'Dimmer', offset: '1' }]) }).optics?.color,
    ).toBeUndefined();
  });
});
