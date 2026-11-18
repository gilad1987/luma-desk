/** MIDI status nibble for Control Change; the low nibble (the channel) is ignored, so every channel works. */
const CONTROL_CHANGE = 0xb0;
/** MIDI status nibble for Note On. */
const NOTE_ON = 0x90;
/** Controller numbers 1-10 move faders 1-10. */
const FIRST_FADER_CC = 1;
const LAST_FADER_CC = 10;
/** Controller 0 moves the grand master. */
const GRAND_MASTER_CC = 0;
/** Notes 36-45 (the first pad bank on most controllers) press GO on executors 1-10. */
const FIRST_GO_NOTE = 36;
const LAST_GO_NOTE = 45;
/** The largest 7-bit MIDI data value; a value divided by it is the 0-1 level the engine uses. */
const MAX_DATA_VALUE = 127;

/**
 * What one MIDI message asks the desk to do:
 * - `level`: move the fader of executor `execIndex` (0-based) to `level` (0-1);
 * - `go`: press GO on executor `execIndex` (0-based);
 * - `grandMaster`: set the grand master to `level` (0-1).
 */
export type MidiAction =
  | { readonly kind: 'level'; readonly execIndex: number; readonly level: number }
  | { readonly kind: 'go'; readonly execIndex: number }
  | { readonly kind: 'grandMaster'; readonly level: number };

/**
 * Maps the bytes of one MIDI message (status, data 1, data 2) to a desk action, or `undefined` when the desk does not
 * use it. A Note On with velocity 0 is a Note Off by MIDI convention, so it does nothing. A missing byte reads as NaN,
 * which keeps the original result for short messages: no match, or a NaN fader level.
 */
export function decodeMidiMessage(data: ArrayLike<number>): MidiAction | undefined {
  const status = data[0] ?? NaN;
  const first = data[1] ?? NaN;
  const second = data[2] ?? NaN;
  const type = status & 0xf0;
  if (type === CONTROL_CHANGE && first >= FIRST_FADER_CC && first <= LAST_FADER_CC) {
    return { kind: 'level', execIndex: first - FIRST_FADER_CC, level: second / MAX_DATA_VALUE };
  }
  if (type === NOTE_ON && second > 0 && first >= FIRST_GO_NOTE && first <= LAST_GO_NOTE) {
    return { kind: 'go', execIndex: first - FIRST_GO_NOTE };
  }
  if (type === CONTROL_CHANGE && first === GRAND_MASTER_CC)
    return { kind: 'grandMaster', level: second / MAX_DATA_VALUE };
  return undefined;
}
