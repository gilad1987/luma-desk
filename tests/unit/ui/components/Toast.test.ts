// @vitest-environment jsdom
/** The toast and its one button (N4): plain text, a longer stay with an action, and the click that runs it. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../../src/core';
import type { EngineEvents } from '../../../../src/engine/events';
import { Toast } from '../../../../src/ui/components/Toast';

const element = (): HTMLElement => {
  const found = document.getElementById('toast');
  if (!found) throw new Error('no toast element');
  return found;
};
/** A bus with a toast on it, on a page that has the toast element. */
function mounted(): EventBus<EngineEvents> {
  document.body.innerHTML = '<div id="toast" style="display:none"></div>';
  const bus = new EventBus<EngineEvents>();
  new Toast(bus);
  return bus;
}

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a message as text only, in the direction of its text, and hides it after its time', () => {
    mounted().emit('message', { kind: 'toast', text: 'Saved <b>x</b>' });
    expect([element().textContent, element().style.display]).toEqual(['Saved <b>x</b>', 'block']);
    expect(element().querySelector('b, button')).toBeNull();
    expect(element().dir).toBe('auto');
    vi.advanceTimersByTime(1800);
    expect(element().style.display).toBe('none');
  });

  it('carries one button for an action, stays longer, and a click runs the action and hides the toast', () => {
    const run = vi.fn();
    mounted().emit('message', { kind: 'toast', text: 'Exported', action: { label: 'Details', run } });
    const button = element().querySelector('button');
    expect(button?.textContent).toBe('Details');
    vi.advanceTimersByTime(1800);
    expect(element().style.display).toBe('block');
    button?.click();
    expect(run).toHaveBeenCalledOnce();
    expect(element().style.display).toBe('none');
  });

  it('drops the button when a later toast has no action', () => {
    const bus = mounted();
    bus.emit('message', { kind: 'toast', text: 'Exported', action: { label: 'Details', run: vi.fn() } });
    bus.emit('message', { kind: 'toast', text: 'Saved' });
    expect(element().querySelector('button')).toBeNull();
    expect(element().textContent).toBe('Saved');
  });
});
