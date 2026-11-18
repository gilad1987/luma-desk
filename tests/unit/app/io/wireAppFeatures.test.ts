/** Checks the order and phase of the app-feature listeners (K4 capture, install events) and the boot-time SW call. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { wireAppFeatures } from '../../../../src/app/io/wireAppFeatures';
import { EventBus, performanceClock } from '../../../../src/core';
import type { EngineEvents, EngineMessage } from '../../../../src/engine/events';
import { he } from '../../../../src/i18n/he';
import { asReal, FakeCanvas, FakeElement } from '../../../shared/dom';

type Listener = (ev: unknown) => void;

function setup(isGuideOpen = false) {
  const elements = new Map(['recBtn', 'fsBtn', 'installBtn'].map((id) => [id, new FakeElement()]));
  const windowListeners: [string, Listener][] = [];
  const documentListeners: [string, Listener, boolean | undefined][] = [];
  const requestFullscreen = vi.fn(() => Promise.resolve());
  const register = vi.fn(() => Promise.resolve());
  vi.stubGlobal('document', {
    getElementById: (id: string) => elements.get(id) ?? null,
    addEventListener: (type: string, listener: Listener, capture?: boolean) =>
      documentListeners.push([type, listener, capture]),
    activeElement: null,
    fullscreenElement: null,
    documentElement: { requestFullscreen },
  });
  vi.stubGlobal('addEventListener', (type: string, listener: Listener) => windowListeners.push([type, listener]));
  vi.stubGlobal('navigator', { serviceWorker: { register } });
  vi.stubGlobal('location', { protocol: 'https:' });
  const bus = new EventBus<EngineEvents>();
  const toasts: string[] = [];
  bus.on('message', (message: EngineMessage) => toasts.push(message.text));
  const canvas = asReal<HTMLCanvasElement>(new FakeCanvas());
  const guide = { isOpen: () => isGuideOpen };
  wireAppFeatures({ canvas, songPlayer: { audioGraph: null }, bus, clock: performanceClock, guide });
  const button = (id: string): FakeElement => elements.get(id) ?? new FakeElement();
  return { button, windowListeners, documentListeners, requestFullscreen, register, toasts };
}

function fKey() {
  return { key: 'f', ctrlKey: false, metaKey: false, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() };
}

describe('wireAppFeatures', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('registers F as a capture keydown, the install events in order, and the worker at boot', () => {
    const { windowListeners, documentListeners, register } = setup();
    expect(documentListeners.map(([type, , capture]) => [type, capture])).toEqual([['keydown', true]]);
    expect(windowListeners.map(([type]) => type)).toEqual(['beforeinstallprompt', 'appinstalled']);
    expect(register).toHaveBeenCalledWith('sw.js');
  });

  it('toggles fullscreen on F unless the guide is open', () => {
    const closed = setup(),
      open = setup(true);
    closed.documentListeners[0]?.[1](fKey());
    open.documentListeners[0]?.[1](fKey());
    expect([closed.requestFullscreen.mock.calls.length, open.requestFullscreen.mock.calls.length]).toEqual([1, 0]);
  });

  it('forwards the REC and fullscreen buttons', () => {
    const { button, toasts, requestFullscreen } = setup();
    button('recBtn').onclick?.({ target: null });
    button('fsBtn').onclick?.({ target: null });
    expect([toasts, requestFullscreen.mock.calls.length]).toEqual([[he.topBar.rec.unsupported], 1]);
  });

  it('shows the install button on the offer and hides it after install', () => {
    const { button, windowListeners, toasts } = setup();
    const installBtn = button('installBtn');
    installBtn.style.display = 'none';
    const offer = { preventDefault: vi.fn(), prompt: () => Promise.resolve(), userChoice: Promise.resolve() };
    windowListeners[0]?.[1](offer);
    const shown = installBtn.style.display;
    windowListeners[1]?.[1](undefined);
    expect([shown, installBtn.style.display, toasts]).toEqual(['', 'none', [he.topBar.install.done]]);
  });
});
