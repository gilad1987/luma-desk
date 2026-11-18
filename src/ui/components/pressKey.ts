import type { StoreModeGuard } from '../shared';

/** The command line as the keypad sees it; the command-line panel implements it over `#cmd` and its history. */
export interface CommandInput {
  value: string;
  /**
   * Adds `entry` to the history; `resetIndex` also restarts Up/Down browsing (the keypad passes false, quirk Q6,
   * orig:2933).
   */
  pushHistory(entry: string, resetIndex: boolean): void;
  run(command: string): void;
}

/** A single digit or the decimal point: these join the number being typed instead of starting a new word. */
const DIGIT_KEY = /^[0-9.]$/;
/** The text ends inside a number, so the next digit continues it and backspace removes one character. */
const ENDS_IN_NUMBER = /[0-9.]$/;

/** Separates a new word from the text before it, unless the text is empty or already ends in a space. */
const spaced = (v: string): string => (v && !v.endsWith(' ') ? v + ' ' : v);

/** Backspace: one character inside a number, else the whole last word (keeping one separating space). */
function backspace(input: CommandInput): void {
  const w = input.value.trimEnd();
  input.value = ENDS_IN_NUMBER.test(w)
    ? w.slice(0, -1)
    : w.replace(/\S+$/, '').trimEnd() + (w.includes(' ') ? ' ' : '');
  if (!input.value.trim()) input.value = '';
}

/**
 * One keypad press. ENTER records history and runs the line (the bare `store` command arms store mode instead);
 * digits extend the current number; words are appended with a trailing space.
 */
export function pressKey(key: string, input: CommandInput, store: StoreModeGuard): void {
  const v = input.value;
  if (key === 'ENTER') {
    if (v.trim()) {
      input.pushHistory(v, false);
      if (store.takeStoreCommand(v)) {
        input.value = '';
        return;
      }
      input.run(v);
    }
    input.value = '';
    return;
  }
  if (key === '⌫') {
    backspace(input);
    return;
  }
  if (DIGIT_KEY.test(key)) {
    input.value = (ENDS_IN_NUMBER.test(v) ? v : spaced(v)) + key;
    return;
  }
  input.value = spaced(v) + key + ' ';
}
