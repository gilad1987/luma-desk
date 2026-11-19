// @vitest-environment jsdom
/**
 * A zoom whose range depends on another channel: the GDTF has one `Zoom` function per condition on the same DMX
 * channel. All of them are carried with their condition, and the default one is the fixture's zoom. A field angle
 * under the beam angle is not believed. Products are invented.
 */
import { describe, expect, it } from 'vitest';
import { gdtfFunctionMode, opticsOf } from '../../shared/index.ts';

const BEAM = 'Name="Beam" ModeMaster="Body_Gobo2" ModeFrom="0/1" ModeTo="0/1" PhysicalFrom="21" PhysicalTo="1.8"';
const SPOT =
  '<ChannelFunction Attribute="Zoom" Name="Spot" ModeMaster="Body_Gobo2.Gobo2.Gobo2" ModeFrom="1/1" ModeTo="255/1" ' +
  'PhysicalFrom="42" PhysicalTo="3"/>';
const EMPTY = '<ChannelFunction Attribute="Zoom" Name="Off" ModeMaster="Body_Gone" PhysicalFrom="0" PhysicalTo="0"/>';
const mode = (channel: string): string =>
  gdtfFunctionMode('Std', [
    { attribute: 'Gobo2', offset: '1,2' },
    { attribute: 'Zoom', offset: '3', channel, fn: BEAM, more: SPOT + EMPTY },
  ]);
const zoomDrives = [{ dmxBreak: 1, offset: [3] }];
const master = { attribute: 'Gobo2', drives: [{ dmxBreak: 1, offset: [1, 2] }] };

describe('a zoom range that depends on another channel', () => {
  it('carries every plausible zoom function with its name and its condition', () => {
    const { optics, drops } = opticsOf({ modes: mode('') });
    expect(optics?.zoomModes).toEqual([
      {
        attribute: 'Zoom',
        drives: zoomDrives,
        dmxFrom: 0,
        dmxTo: 255,
        from: 21,
        to: 1.8,
        label: 'Beam',
        when: { ...master, dmxFrom: 0, dmxTo: 0 },
      },
      {
        attribute: 'Zoom',
        drives: zoomDrives,
        dmxFrom: 0,
        dmxTo: 255,
        from: 42,
        to: 3,
        label: 'Spot',
        when: { ...master, dmxFrom: 257, dmxTo: 65535 },
      },
    ]);
    expect(drops).toEqual([]);
  });

  it('takes the first function as the zoom, or the one the channel names as its initial function', () => {
    expect(opticsOf({ modes: mode('') }).optics?.zoom).toMatchObject({ from: 21, to: 1.8, when: { dmxTo: 0 } });
    const initial = opticsOf({ modes: mode('InitialFunction="Body_Zoom.Zoom.Spot"') }).optics?.zoom;
    expect(initial).toMatchObject({ from: 42, to: 3, when: { dmxFrom: 257 } });
    expect(initial?.label).toBeUndefined();
  });

  it('has no zoom modes when the mode has one zoom function', () => {
    const single = gdtfFunctionMode('Std', [
      { attribute: 'Zoom', offset: '1', fn: 'PhysicalFrom="5" PhysicalTo="50"' },
    ]);
    expect(opticsOf({ modes: single }).optics?.zoomModes).toBeUndefined();
  });

  it('drops a field angle that is under the beam angle', () => {
    const geometries = '<Geometry Name="Body"><Beam Name="Beam" BeamAngle="10" FieldAngle="1"/></Geometry>';
    const { optics, drops } = opticsOf({ geometries, modes: mode('') });
    expect(optics?.beam).toEqual({ beamAngle: 10 });
    expect(drops).toEqual([{ part: 'fieldAngle', reason: 'belowBeam' }]);
  });
});
