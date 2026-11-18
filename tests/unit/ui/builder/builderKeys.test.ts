/**
 * Owns the builder shortcuts: which key means which edit, that a matched key is prevented, that keys typed in a field
 * are left alone, and that the disposer removes the listener. What each edit does is owned by EditToolbar.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keyActionOf, listenBuilderKeys, type KeyPress } from '../../../../src/ui/builder/builderKeys.ts';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';

type Listener = (ev: KeyPress) => void;

const press = (key: string, mods: Partial<Pick<KeyPress, 'ctrlKey' | 'metaKey' | 'shiftKey'>> = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  target: null,
  preventDefault: vi.fn(),
  ...mods,
});

describe('keyActionOf', () => {
  it('maps Ctrl/Cmd+Z, Ctrl+Shift+Z, Ctrl+Y, Ctrl+D and Delete, and nothing else', () => {
    const cases = [
      press('z', { ctrlKey: true }),
      press('z', { metaKey: true }),
      press('Z', { ctrlKey: true, shiftKey: true }),
      press('y', { ctrlKey: true }),
      press('d', { ctrlKey: true }),
      press('Delete'),
      press('z'),
      press('Backspace'),
      press('a', { ctrlKey: true }),
    ];
    expect(cases.map(keyActionOf)).toEqual(['undo', 'undo', 'redo', 'redo', 'duplicate', 'delete', null, null, null]);
  });
});

describe('listenBuilderKeys', () => {
  let listeners: Set<Listener>;
  const source = {
    addEventListener: (_type: 'keydown', listener: Listener) => void listeners.add(listener),
    removeEventListener: (_type: 'keydown', listener: Listener) => void listeners.delete(listener),
  };
  const send = (ev: KeyPress): void => listeners.forEach((listener) => listener(ev));
  beforeEach(() => {
    new FakeDom();
    listeners = new Set();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('runs a matched key with preventDefault, ignores keys typed in a field, and stops after dispose', () => {
    const run = vi.fn();
    const stop = listenBuilderKeys(source, run);
    const ctrlD = press('d', { ctrlKey: true });
    send(ctrlD);
    send({ ...press('Delete'), target: asReal<EventTarget>(new FakeElement('INPUT')) });
    send({ ...press('Delete'), target: asReal<EventTarget>(new FakeElement('BUTTON')) });
    send(press('x'));
    stop();
    send(press('Delete'));
    expect([run.mock.calls, ctrlD.preventDefault.mock.calls.length, listeners.size]).toEqual([
      [['duplicate'], ['delete']],
      1,
      0,
    ]);
  });
});
