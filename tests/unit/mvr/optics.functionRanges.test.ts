// @vitest-environment jsdom
/**
 * The DMX range of a channel function ends where the next function of the whole `DMXChannel` starts, across its
 * logical channels; without an `InitialFunction`, the function the master's default makes active is the default.
 */
import { describe, expect, it } from 'vitest';
import { gdtfFunctionMode, opticsOf } from '../../shared/index.ts';

const logical = (attribute: string, from: string): string =>
  `<LogicalChannel Attribute="${attribute}"><ChannelFunction Name="${attribute}" Attribute="${attribute}" ` +
  `DMXFrom="${from}" PhysicalFrom="0" PhysicalTo="20"/></LogicalChannel>`;
const SHUTTER =
  '<DMXMode Name="Std" Geometry="Body"><DMXChannels><DMXChannel DMXBreak="1" Offset="1" Geometry="Body">' +
  `${logical('Shutter1', '0/1')}${logical('Shutter1Strobe', '128/1')}</DMXChannel></DMXChannels></DMXMode>`;

const ZOOMS = 'Name="Spot" PhysicalFrom="40" PhysicalTo="10" ModeMaster="Body_Gobo1" ModeFrom="0/1" ModeTo="127/1"';
const BEAM_ZOOM =
  '<ChannelFunction Name="Beam" Attribute="Zoom" PhysicalFrom="21" PhysicalTo="2" ModeMaster="Body_Gobo1" ' +
  'ModeFrom="128/1" ModeTo="255/1"/>';
const zoomBehindGobo = (goboDefault: string): string =>
  gdtfFunctionMode('Std', [
    { attribute: 'Gobo1', offset: '1', fn: goboDefault },
    { attribute: 'Zoom', offset: '2', fn: ZOOMS, more: BEAM_ZOOM },
  ]);

describe('the zoom that is active by default', () => {
  it('is the one whose ModeMaster range holds the master default, when no InitialFunction names one', () => {
    const { optics } = opticsOf({ modes: zoomBehindGobo('Default="200/1"') });
    expect(optics?.zoom).toMatchObject({ from: 21, to: 2, when: { attribute: 'Gobo1', dmxFrom: 128, dmxTo: 255 } });
  });

  it('falls back to the first when the master default selects none or the master has no default', () => {
    expect(opticsOf({ modes: zoomBehindGobo('Default="0/1"') }).optics?.zoom).toMatchObject({ from: 40, to: 10 });
    expect(opticsOf({ modes: zoomBehindGobo('') }).optics?.zoom).toMatchObject({ from: 40, to: 10 });
  });
});

describe('channel function ranges', () => {
  it('ends a function of one logical channel where the next logical channel of the DMX channel starts', () => {
    const shaping = opticsOf({ modes: SHUTTER }).optics?.shaping;
    expect(shaping?.shutter).toMatchObject({ attribute: 'Shutter1', dmxFrom: 0, dmxTo: 127 });
    expect(shaping?.strobe).toMatchObject({ attribute: 'Shutter1Strobe', dmxFrom: 128, dmxTo: 255 });
  });
});
