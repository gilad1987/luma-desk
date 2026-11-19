// @vitest-environment jsdom
/**
 * A channel with more than 4 `Offset` bytes: a GDTF `DMXValue` names at most 4 bytes, so the channel's values are
 * read with 4 bytes. Before, 128 or more bytes made the channel maximum 256^128 - 1, which is Infinity.
 */
import { describe, expect, it } from 'vitest';
import { readFunctions } from '../../../src/mvr/gdtf/optics/readFunctions.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';

const channel = parseXml(
  '<DMXChannel><LogicalChannel Attribute="Dimmer"><ChannelFunction Name="Dim" Attribute="Dimmer" DMXFrom="0/1">' +
    '<ChannelSet Name="Low" DMXFrom="0/1"/><ChannelSet Name="High" DMXFrom="128/1"/></ChannelFunction>' +
    '</LogicalChannel></DMXChannel>',
).documentElement;

describe('readFunctions offset bytes', () => {
  it.each([[5], [128], [300]])('reads a channel of %i offset bytes as a 4-byte channel', (bytes) => {
    const [fn] = readFunctions(channel, bytes);
    expect([fn?.dmxTo, fn?.sets.map((set) => [set.dmxFrom, set.dmxTo])]).toEqual([
      256 ** 4 - 1,
      [
        [0, 0x8080807f],
        [0x80808080, 256 ** 4 - 1],
      ],
    ]);
  });

  it('keeps a 2-byte channel', () => {
    expect(readFunctions(channel, 2)[0]?.dmxTo).toBe(65535);
  });
});
