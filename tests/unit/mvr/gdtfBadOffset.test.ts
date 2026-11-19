// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { breakFootprint } from '../../../src/mvr/gdtf/breakFootprint.ts';
import { modeChannels } from '../../../src/mvr/gdtf/modeChannels.ts';
import { readGdtf } from '../../../src/mvr/gdtf/readGdtf.ts';
import { gdtfMode, makeGdtf } from '../../shared/index.ts';

const BODY = '<Geometry Name="Body"/>';

it('drops a channel Offset below 1 at the reader, says so once, and patches only real slots', () => {
  const modes = gdtfMode('Std', [
    ['Dimmer', 'Offset="0"'],
    ['Pan', 'Offset="1"'],
    ['Tilt', 'Offset="-2,2"'],
    ['Zoom', 'Offset="1.5"'],
  ]);
  const { info, warnings } = readGdtf(makeGdtf({ geometries: BODY, modes }), 'a.gdtf');
  expect(info?.modes[0]?.channels.map((channel) => channel.offset)).toEqual([[], [1], [2], []]);
  expect(warnings.map((warning) => [warning.code, warning.ref])).toEqual([['bad-gdtf', 'a.gdtf']]);
  expect(warnings[0]?.message).toContain('3 channel Offsets');
  if (info === undefined) throw new Error('no GDTF info');
  const { channels } = modeChannels(info, 'Std', 'a.gdtf');
  expect(channels.flatMap((channel) => channel.offset).every((offset) => offset >= 1)).toBe(true);
  expect(breakFootprint(channels)).toBe(2);
});

it('gives a file with good offsets no offset warning', () => {
  const modes = gdtfMode('Std', [['Dimmer', 'Offset="1"']]);
  expect(readGdtf(makeGdtf({ geometries: BODY, modes }), 'b.gdtf').warnings).toEqual([]);
});
