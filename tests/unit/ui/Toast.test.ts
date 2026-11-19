import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../src/core';
import type { EngineEvents } from '../../../src/engine/events';
import { Toast } from '../../../src/ui/components/Toast';
import { FakeDom, type FakeElement } from '../../shared/dom';

describe('Toast', () => {
  let element: FakeElement, bus: EventBus<EngineEvents>, toast: Toast;
  beforeEach(() => {
    vi.useFakeTimers();
    element = new FakeDom().add('toast');
    bus = new EventBus<EngineEvents>();
    toast = new Toast(bus);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the text and hides it 1800 ms after the latest toast', () => {
    toast.show('one');
    expect([element.textContent, element.style.display]).toEqual(['one', 'block']);
    vi.advanceTimersByTime(1000);
    toast.show('two');
    vi.advanceTimersByTime(1799);
    expect([element.textContent, element.style.display]).toEqual(['two', 'block']);
    vi.advanceTimersByTime(1);
    expect(element.style.display).toBe('none');
  });

  it('keeps a long text up 50 ms per character, at most 15 s', () => {
    toast.show('x'.repeat(271));
    vi.advanceTimersByTime(13549);
    expect(element.style.display).toBe('block');
    vi.advanceTimersByTime(1);
    expect(element.style.display).toBe('none');
    toast.show('x'.repeat(1000));
    vi.advanceTimersByTime(14999);
    expect(element.style.display).toBe('block');
    vi.advanceTimersByTime(1);
    expect(element.style.display).toBe('none');
  });

  it('shows engine toast messages and ignores log messages', () => {
    bus.emit('message', { kind: 'log', text: 'logged', level: 'ok' });
    expect(element.style.display).toBe('');
    bus.emit('message', { kind: 'toast', text: 'Select fixtures first' });
    expect([element.textContent, element.style.display]).toEqual(['Select fixtures first', 'block']);
  });
});
