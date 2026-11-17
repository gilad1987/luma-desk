/** Owns the fullscreen toggle and the F shortcut's guards (listener K4, 03-ui.md §8.1). */
import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../src/core';
import type { EngineEvents, EngineMessage } from '../../../src/engine/events';
import { he } from '../../../src/i18n/he';
import { Fullscreen, type FullscreenDocument } from '../../../src/io/Fullscreen';

function setup(options: { tagName?: string; isGuideOpen?: boolean; canRequest?: boolean; isFull?: boolean } = {}) {
  const bus = new EventBus<EngineEvents>();
  const toasts: string[] = [];
  bus.on('message', (message: EngineMessage) => toasts.push(message.text));
  const requestFullscreen = vi.fn(() => Promise.resolve());
  const exitFullscreen = vi.fn(() => Promise.resolve());
  const document: FullscreenDocument = {
    activeElement: options.tagName ? { tagName: options.tagName } : null,
    fullscreenElement: options.isFull ? {} : null,
    documentElement: options.canRequest === false ? {} : { requestFullscreen },
    exitFullscreen,
  };
  const fullscreen = new Fullscreen({ document, bus, isGuideOpen: () => options.isGuideOpen ?? false });
  return { fullscreen, requestFullscreen, exitFullscreen, toasts };
}

function key(init: { key: string; ctrlKey?: boolean; metaKey?: boolean }) {
  const preventDefault = vi.fn(),
    stopImmediatePropagation = vi.fn();
  const event = { ctrlKey: false, metaKey: false, ...init, preventDefault, stopImmediatePropagation };
  return { event, preventDefault, stopImmediatePropagation };
}

describe('Fullscreen', () => {
  it('enters fullscreen, or leaves it when already full', () => {
    const normal = setup(),
      full = setup({ isFull: true });
    normal.fullscreen.toggle();
    full.fullscreen.toggle();
    const count = (s: ReturnType<typeof setup>) =>
      [s.requestFullscreen, s.exitFullscreen].map((f) => f.mock.calls.length);
    expect([count(normal), count(full)]).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  it('toasts when the browser refuses fullscreen', async () => {
    const { fullscreen, requestFullscreen, toasts } = setup();
    requestFullscreen.mockReturnValueOnce(Promise.reject(new Error('denied')));
    fullscreen.toggle();
    await Promise.resolve();
    await Promise.resolve();
    expect(toasts).toEqual([he.topBar.fullscreen.unavailable]);
  });

  it('does nothing on a browser without requestFullscreen', () => {
    const { fullscreen, toasts } = setup({ canRequest: false });
    fullscreen.toggle();
    expect(toasts).toEqual([]);
  });

  it('takes f and F and stops the event so the desk keys never see it', () => {
    const { fullscreen, requestFullscreen } = setup();
    const lower = key({ key: 'f' }),
      upper = key({ key: 'F' });
    fullscreen.handleKey(lower.event);
    fullscreen.handleKey(upper.event);
    const calls = [lower.preventDefault, lower.stopImmediatePropagation, upper.preventDefault].map(
      (f) => f.mock.calls.length,
    );
    expect([calls, requestFullscreen.mock.calls.length]).toEqual([[1, 1, 1], 2]);
  });

  it('ignores Ctrl/Meta+F, typing in a field and the open guide, but not a focused SELECT', () => {
    const cases = [
      { setup: setup(), event: key({ key: 'f', ctrlKey: true }) },
      { setup: setup(), event: key({ key: 'f', metaKey: true }) },
      { setup: setup({ tagName: 'INPUT' }), event: key({ key: 'f' }) },
      { setup: setup({ tagName: 'TEXTAREA' }), event: key({ key: 'F' }) },
      { setup: setup({ isGuideOpen: true }), event: key({ key: 'f' }) },
      { setup: setup(), event: key({ key: 'g' }) },
      { setup: setup({ tagName: 'SELECT' }), event: key({ key: 'f' }) },
    ];
    for (const { setup: s, event } of cases) s.fullscreen.handleKey(event.event);
    // Quirk kept: a focused SELECT does not block F (03-ui.md §8.1, Q5)
    expect(cases.map(({ setup: s }) => s.requestFullscreen.mock.calls.length)).toEqual([0, 0, 0, 0, 0, 0, 1]);
  });
});
