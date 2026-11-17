// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { GdtfInfo } from '../../../src/mvr/gdtf/GdtfInfo.ts';
import { modeChannels } from '../../../src/mvr/gdtf/modeChannels.ts';
import { readGdtf } from '../../../src/mvr/gdtf/readGdtf.ts';
import { gdtfMode, makeGdtf } from '../../shared/index.ts';

function info(modes: string, geometries = ''): GdtfInfo {
  const result = readGdtf(makeGdtf({ geometries, modes }), 'f.gdtf');
  if (result.info === undefined) throw new Error('test GDTF did not parse');
  return result.info;
}

const TWO_MODES = info(
  gdtfMode('4ch', [
    ['Dimmer', 'Offset="1"'],
    ['Pan', 'Offset="2,3"'],
    ['Tilt', 'Offset="4"'],
  ]) + gdtfMode('1ch', [['Dimmer', 'Offset="1"']]),
);

describe('modeChannels', () => {
  it('lists the named mode in DMX order', () => {
    const { mode, channels, warnings } = modeChannels(TWO_MODES, '1ch', 'fx-1');
    expect(mode).toBe('1ch');
    expect(channels).toEqual([{ attribute: 'Dimmer', attr: 'dim', dmxBreak: 1, offset: [1] }]);
    expect(warnings).toEqual([]);
  });

  it.each(['', 'Mode 9'])('falls back to the first mode with a warning for mode "%s"', (modeName) => {
    const { mode, channels, warnings } = modeChannels(TWO_MODES, modeName, 'fx-1');
    expect(mode).toBe('4ch');
    expect(channels.map((channel) => channel.offset)).toEqual([[1], [2, 3], [4]]);
    expect(warnings).toEqual([expect.objectContaining({ code: 'unknown-mode', ref: 'fx-1' })]);
  });

  it('warns and gives no channels when the GDTF has no modes', () => {
    const result = modeChannels(info(''), 'Std', 'fx-2');
    expect(result).toMatchObject({ mode: '', channels: [] });
    expect(result.warnings[0]?.code).toBe('unknown-mode');
  });

  it('keeps a virtual Offset="" channel with an empty offset, after the patched ones', () => {
    const custom = info(
      gdtfMode('Custom', [
        ['Tilt', 'Offset=""'],
        ['Dimmer', 'Offset="1"'],
        ['Zoom', 'Offset="None"'],
      ]),
    );
    const { channels } = modeChannels(custom, 'Custom', 'fx-3');
    expect(channels).toEqual([
      { attribute: 'Dimmer', attr: 'dim', dmxBreak: 1, offset: [1] },
      { attribute: 'Tilt', attr: 'tilt', dmxBreak: 1, offset: [] },
      { attribute: 'Zoom', attr: 'zoom', dmxBreak: 1, offset: [] },
    ]);
  });
});

describe('modeChannels references and fallbacks', () => {
  it('expands GeometryReference channels with two breaks', () => {
    const reference = (name: string, offset1: number, offset2: number): string =>
      `<GeometryReference Name="${name}" Geometry="Pixel">` +
      `<Break DMXBreak="1" DMXOffset="${offset1}"/><Break DMXBreak="2" DMXOffset="${offset2}"/></GeometryReference>`;
    const geometries = `<Geometry Name="Bar">${reference('P1', 2, 1)}${reference('P2', 4, 3)}</Geometry>`;
    const bar = info(
      gdtfMode(
        'Pixels',
        [
          ['Dimmer', 'Offset="1" Geometry="Bar"'],
          ['ColorAdd_R', 'Offset="1" DMXBreak="1" Geometry="Pixel"'],
          ['ColorAdd_G', 'Offset="2" DMXBreak="1" Geometry="Pixel"'],
          ['Zoom', 'Offset="1,2" DMXBreak="2" Geometry="Pixel"'],
          ['Gobo1', 'Offset="" DMXBreak="Overwrite" Geometry="Pixel"'],
        ],
        'Bar',
      ),
      geometries,
    );
    const slots = modeChannels(bar, 'Pixels', 'fx-4').channels.map((c) => [c.attribute, c.dmxBreak, c.offset]);
    expect(slots).toEqual([
      ['Dimmer', 1, [1]],
      ['ColorAdd_R', 1, [2]],
      ['ColorAdd_G', 1, [3]],
      ['ColorAdd_R', 1, [4]],
      ['ColorAdd_G', 1, [5]],
      ['Zoom', 2, [1, 2]],
      ['Zoom', 2, [3, 4]],
      ['Gobo1', 2, []],
      ['Gobo1', 2, []],
    ]);
  });
});
