import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../src/core';
import { AppState } from '../../../src/engine/AppState';
import type { EngineEvents } from '../../../src/engine/events';
import { Keypad } from '../../../src/ui/components/Keypad';
import { pressKey, type CommandInput } from '../../../src/ui/components/pressKey';
import { StoreModeGuard } from '../../../src/ui/shared';
import { FakeDom } from './fakes/installFakeDom';

const setup = (value = '') => {
  const input = { value, pushHistory: vi.fn(), run: vi.fn() } satisfies CommandInput;
  const guard = new StoreModeGuard(new AppState(new EventBus<EngineEvents>()));
  const type = (...keys: string[]) => keys.forEach((key) => pressKey(key, input, guard));
  return { input, guard, type };
};

describe('pressKey', () => {
  it('builds commands: words get a trailing space, digits join the number being typed', () => {
    const { input, type } = setup();
    type('Fixture', '1', '2', 'Thru', '4', '.', '5', 'At', 'Full');
    expect(input.value).toBe('Fixture 12 Thru 4.5 At Full ');
    const typed = setup('Cue');
    typed.type('3');
    expect(typed.input.value).toBe('Cue 3');
  });

  it('backspace removes one character of a number, else the last word with its space', () => {
    const { input, type } = setup('Group 12');
    type('⌫');
    expect(input.value).toBe('Group 1');
    type('⌫', '⌫');
    expect(input.value).toBe('');
    const words = setup('Fixture 1 Thru ');
    words.type('⌫');
    expect(words.input.value).toBe('Fixture 1 ');
  });

  it('ENTER pushes history without resetting the browse index, runs, then clears', () => {
    const { input, type } = setup('Goto 3');
    type('ENTER');
    expect(input.pushHistory).toHaveBeenCalledWith('Goto 3', false);
    expect(input.run).toHaveBeenCalledWith('Goto 3');
    expect(input.value).toBe('');
  });

  it('ENTER on a blank line only clears; ENTER on `store` arms store mode instead of running', () => {
    const blank = setup('   ');
    blank.type('ENTER');
    expect([blank.input.value, blank.input.pushHistory.mock.calls.length]).toEqual(['', 0]);
    const { input, guard, type } = setup(' Store ');
    type('ENTER');
    expect([input.pushHistory.mock.calls, input.run.mock.calls.length]).toEqual([[[' Store ', false]], 0]);
    expect([guard.active, input.value]).toEqual([true, '']);
  });
});

describe('Keypad', () => {
  let dom: FakeDom;
  beforeEach(() => (dom = new FakeDom()));
  afterEach(() => vi.unstubAllGlobals());

  it('builds the 28-key grid in legacy order and classes; a click presses its key', () => {
    const { input, guard } = setup('Cue');
    new Keypad(input, guard);
    const [grid, ...buttons] = dom.created;
    expect(grid?.className).toBe('keypad');
    expect(grid?.children).toEqual(buttons);
    expect(buttons.map((b) => `${b.innerHTML}:${b.className}`).join(' ')).toBe(
      'Fixture:w Group:w Preset:w Cue:w Exec:w ⌫:bk 7:n 8:n 9:n Thru:w At:w Full:w 4:n 5:n 6:n +:w Goto:w Zero:w ' +
        '1:n 2:n 3:n -:w Fade:w Label:w 0:n .:n Delete:w ENTER:en',
    );
    buttons[6]?.onclick?.({ target: undefined });
    expect(input.value).toBe('Cue 7');
  });
});
