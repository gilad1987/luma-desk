import { isTextField } from '../shared';

/** The edits the builder keyboard reaches. */
export type KeyAction = 'undo' | 'redo' | 'duplicate' | 'delete';

/** The parts of a `keydown` event the builder keys read. */
export type KeyPress = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'target' | 'preventDefault'>;

/** Where the builder listens for keys: `document` in the app, a fake in tests. */
export interface KeySource {
  addEventListener(type: 'keydown', listener: (ev: KeyPress) => void): void;
  removeEventListener(type: 'keydown', listener: (ev: KeyPress) => void): void;
}

/**
 * The edit a key press asks for, or `null`. Backspace deletes too, because a Mac keyboard has no Delete key. Ctrl and
 * Cmd both count, so the Mac shortcuts work too; Shift makes Ctrl+Z read as an upper-case Z, so keys compare in lower
 * case.
 */
export function keyActionOf(ev: KeyPress): KeyAction | null {
  if (ev.key === 'Delete' || ev.key === 'Backspace') return 'delete';
  if (!ev.ctrlKey && !ev.metaKey) return null;
  const key = ev.key.toLowerCase();
  if (key === 'z') return ev.shiftKey ? 'redo' : 'undo';
  if (key === 'y') return 'redo';
  if (key === 'd') return 'duplicate';
  return null;
}

/**
 * Sends the builder shortcuts to `run` until the returned disposer is called. A key typed in a field is left to the
 * field, so Delete in a number box deletes a digit, not the picked fixtures. A matched key is prevented, so Ctrl+D
 * does not bookmark the page.
 */
export function listenBuilderKeys(source: KeySource, run: (action: KeyAction) => void): () => void {
  const listener = (ev: KeyPress): void => {
    if (isTextField(ev.target instanceof Element ? ev.target : null)) return;
    const action = keyActionOf(ev);
    if (!action) return;
    ev.preventDefault();
    run(action);
  };
  source.addEventListener('keydown', listener);
  return () => source.removeEventListener('keydown', listener);
}
