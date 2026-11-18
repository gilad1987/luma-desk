/** Owns the MIDI byte mapping (03-ui.md §8.2). Device access and the click flow are in Midi.test.ts. */
import { describe, expect, it } from 'vitest';
import { decodeMidiMessage } from '../../../src/io/midiMessage';

describe('decodeMidiMessage', () => {
  it('maps CC 1-10 on any channel to fader levels of executors 1-10', () => {
    expect([decodeMidiMessage([0xb0, 1, 127]), decodeMidiMessage([0xbf, 10, 0])]).toEqual([
      { kind: 'level', execIndex: 0, level: 1 },
      { kind: 'level', execIndex: 9, level: 0 },
    ]);
  });

  it('maps CC 0 to the grand master', () => {
    expect(decodeMidiMessage([0xb3, 0, 64])).toEqual({ kind: 'grandMaster', level: 64 / 127 });
  });

  it('maps note-on 36-45 with velocity to GO on executors 1-10', () => {
    expect([decodeMidiMessage([0x90, 36, 1]), decodeMidiMessage([0x95, 45, 100])]).toEqual([
      { kind: 'go', execIndex: 0 },
      { kind: 'go', execIndex: 9 },
    ]);
  });

  it('ignores velocity 0, notes and controllers outside the ranges, and other message types', () => {
    const ignored = [
      [0x90, 36, 0],
      [0x90, 35, 100],
      [0x90, 46, 100],
      [0xb0, 11, 100],
      [0x80, 36, 100],
      [0xe0, 1, 100],
    ];
    expect(ignored.map((bytes) => decodeMidiMessage(bytes))).toEqual(ignored.map(() => undefined));
  });

  it('gives a NaN level for a fader message without a value byte, as the original did', () => {
    expect(decodeMidiMessage([0xb0, 2])).toEqual({ kind: 'level', execIndex: 1, level: NaN });
  });
});
