import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUiServices } from '../../../../src/app/ui/createUiServices';
import { EventBus } from '../../../../src/core';
import { AppState } from '../../../../src/engine/AppState';
import type { EngineEvents } from '../../../../src/engine/events';
import { FakeDom } from '../../../shared/dom';

// legacy: toast() at main.ts 3cbff92 lines 71-78, the modal wiring at 1211-1223 and 1263-1265
describe('createUiServices', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows toast messages, closes the modal from #hClose, and guards store mode through the engine', () => {
    const dom = new FakeDom();
    for (const id of ['modal', 'mbox', 'toast']) dom.add(id);
    vi.useFakeTimers();
    const bus = new EventBus<EngineEvents>();
    const state = new AppState(bus);
    const { modal, store } = createUiServices(bus, state);
    bus.emit('message', { kind: 'toast', text: 'Show loaded' });
    expect([dom.get('toast').textContent, dom.get('toast').style.display]).toEqual(['Show loaded', 'block']);
    vi.advanceTimersByTime(1800);
    expect(dom.get('toast').style.display).toBe('none');
    modal.open('<h2>x</h2>');
    expect(modal.isOpen()).toBe(true);
    for (const listener of dom.documentClicks) listener({ target: dom.add('hClose') });
    expect(modal.isOpen()).toBe(false);
    store.set(true);
    expect([state.storeMode, store.active]).toEqual([true, true]);
  });
});
