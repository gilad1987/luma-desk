// @vitest-environment jsdom
/**
 * Gobo wheels with slot names and image names, rotating or static; prism facets, iris, frost, blades and the
 * shutter with its strobe frequency. Shaping is presence and DMX slots only. Products are invented.
 */
import { describe, expect, it } from 'vitest';
import { gdtfFunctionMode, opticsOf } from '../../shared/index.ts';

const WHEELS =
  '<Wheel Name="Gobos A"><Slot Name="Open"/><Slot Name="Star" MediaFileName="star"/></Wheel>' +
  '<Wheel Name="Gobos B"><Slot Name="Open"/><Slot Name="Dots" MediaFileName="dots"/></Wheel>' +
  '<Wheel Name="Prisms"><Slot Name="Open"/><Slot Name="Three"><Facet/><Facet/><Facet/></Slot></Wheel>';
const STROBE = '<ChannelFunction Attribute="Shutter1Strobe" DMXFrom="32/1" PhysicalFrom="1" PhysicalTo="25"/>';
const MODE = gdtfFunctionMode('Std', [
  { attribute: 'Gobo1', offset: '1', fn: 'Wheel="Gobos A"', sets: '<ChannelSet DMXFrom="8/1" WheelSlotIndex="2"/>' },
  { attribute: 'Gobo1PosRotate', offset: '2' },
  { attribute: 'Gobo2', offset: '3', fn: 'Wheel="Gobos B"' },
  { attribute: 'Gobo3', offset: '4', fn: 'Wheel="No such wheel"' },
  { attribute: 'Prism1', offset: '5', fn: 'Wheel="Prisms"' },
  { attribute: 'Iris', offset: '6,7', fn: 'PhysicalFrom="1" PhysicalTo="0"' },
  { attribute: 'Frost1', offset: '8' },
  { attribute: 'Blade1A', offset: '9' },
  { attribute: 'Blade1Rot', offset: '10' },
  { attribute: 'ShaperRot', offset: '11' },
  { attribute: 'Shutter1', offset: '12', more: STROBE },
]);
const { optics } = opticsOf({ wheels: WHEELS, modes: MODE });

describe('gobos and beam shaping from a GDTF', () => {
  it('lists the gobo wheels with slot names and image file names, rotating or static', () => {
    expect(optics?.gobos?.map((wheel) => [wheel.attribute, wheel.name, wheel.rotating])).toEqual([
      ['Gobo1', 'Gobos A', true],
      ['Gobo2', 'Gobos B', false],
    ]);
    expect(optics?.gobos?.[0]?.slots).toEqual([
      { name: 'Open' },
      { name: 'Star', image: 'star.png', dmxFrom: 8, dmxTo: 255 },
    ]);
    expect(optics?.gobos?.[1]?.drives).toEqual([{ dmxBreak: 1, offset: [3] }]);
  });

  it('counts the facets of a prism slot', () => {
    expect(optics?.shaping?.prisms?.[0]?.slots).toEqual([{ name: 'Open' }, { name: 'Three', facets: 3 }]);
  });

  it('carries iris, frost and blades with their DMX slots', () => {
    const shaping = optics?.shaping;
    expect(shaping?.iris).toMatchObject({ from: 1, to: 0, dmxTo: 65535, drives: [{ dmxBreak: 1, offset: [6, 7] }] });
    expect(shaping?.frost?.map((fn) => fn.attribute)).toEqual(['Frost1']);
    expect(shaping?.blades?.map((fn) => fn.attribute)).toEqual(['Blade1A', 'Blade1Rot', 'ShaperRot']);
  });

  it('splits one DMX channel into shutter and strobe and reads the strobe frequency', () => {
    const drives = [{ dmxBreak: 1, offset: [12] }];
    expect(optics?.shaping?.shutter).toEqual({ attribute: 'Shutter1', drives, dmxFrom: 0, dmxTo: 31 });
    expect(optics?.shaping?.strobe).toEqual({
      attribute: 'Shutter1Strobe',
      drives,
      dmxFrom: 32,
      dmxTo: 255,
      from: 1,
      to: 25,
    });
  });

  it('has no gobos or shaping on a mode without them', () => {
    const plain = opticsOf({ modes: gdtfFunctionMode('Std', [{ attribute: 'Dimmer', offset: '1' }]) }).optics;
    expect(plain?.gobos).toBeUndefined();
    expect(plain?.shaping).toBeUndefined();
  });
});
