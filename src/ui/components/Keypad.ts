import { createElement, type StoreModeGuard } from '../shared';
import { pressKey, type CommandInput } from './pressKey';

/** Key label and its class: `w` word key, `n` digit, `bk` backspace, `en` ENTER. Grid order, row by row. */
const KEYS: readonly (readonly [label: string, className: string])[] = [
  ['Fixture', 'w'],
  ['Group', 'w'],
  ['Preset', 'w'],
  ['Cue', 'w'],
  ['Exec', 'w'],
  ['⌫', 'bk'],
  ['7', 'n'],
  ['8', 'n'],
  ['9', 'n'],
  ['Thru', 'w'],
  ['At', 'w'],
  ['Full', 'w'],
  ['4', 'n'],
  ['5', 'n'],
  ['6', 'n'],
  ['+', 'w'],
  ['Goto', 'w'],
  ['Zero', 'w'],
  ['1', 'n'],
  ['2', 'n'],
  ['3', 'n'],
  ['-', 'w'],
  ['Fade', 'w'],
  ['Label', 'w'],
  ['0', 'n'],
  ['.', 'n'],
  ['Delete', 'w'],
  ['ENTER', 'en'],
];

/**
 * The on-screen command keypad of the desk and MA layouts. It types into the same command line as the keyboard, so
 * a touch-only operator can build every command; the layout decides where `element` goes.
 */
export class Keypad {
  /** The `.keypad` grid of buttons. */
  readonly element: HTMLDivElement;

  constructor(input: CommandInput, store: StoreModeGuard) {
    this.element = createElement('div', 'keypad');
    for (const [label, className] of KEYS) {
      const button = createElement('button', className, label);
      button.onclick = () => pressKey(label, input, store);
      this.element.appendChild(button);
    }
  }
}
