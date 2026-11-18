/**
 * Owns the add and remove pair of `listenWa`. Whether Web Awesome fires the event is owned by tests/e2e/; this file
 * loads no component.
 */
import { describe, expect, it } from 'vitest';
import { listenWa } from '../../../../../src/ui/builder/wa/waEvents';

type Listener = EventListenerOrEventListenerObject | null;

function fakeTarget() {
  const added: [string, Listener][] = [];
  const removed: [string, Listener][] = [];
  return {
    added,
    removed,
    addEventListener: (type: string, listener: Listener) => void added.push([type, listener]),
    removeEventListener: (type: string, listener: Listener) => void removed.push([type, listener]),
  };
}

describe('listenWa', () => {
  // catches a disposer that removes a different function than it added, which leaks the listener after exit
  it('adds the handler and its disposer removes the same one', () => {
    const target = fakeTarget();
    const handler = (_ev: Event): void => undefined;
    const dispose = listenWa(target, 'wa-reposition', handler);
    const before = target.removed.length;
    dispose();
    expect([target.added, before, target.removed]).toEqual([
      [['wa-reposition', handler]],
      0,
      [['wa-reposition', handler]],
    ]);
  });
});
