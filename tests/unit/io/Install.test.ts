/** Owns the install button's show/hide flow; the browser's real install dialog is outside any test. */
import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../src/core';
import type { EngineEvents, EngineMessage } from '../../../src/engine/events';
import { he } from '../../../src/i18n/he';
import { Install } from '../../../src/io/Install';

class FakeInstallPrompt extends Event {
  readonly prompt = vi.fn(() => Promise.resolve());
  readonly userChoice = Promise.resolve({ outcome: 'accepted' });
  constructor() {
    super('beforeinstallprompt', { cancelable: true });
  }
}

function setup() {
  const bus = new EventBus<EngineEvents>();
  const toasts: string[] = [];
  bus.on('message', (message: EngineMessage) => toasts.push(message.text));
  const button = { style: { display: 'none' } };
  return { install: new Install({ button, bus }), button, toasts };
}

describe('Install', () => {
  it('shows the button for an offer and hides it after the prompt', async () => {
    const { install, button } = setup();
    const offer = new FakeInstallPrompt();
    install.offer(offer);
    const shown = [button.style.display, offer.defaultPrevented];
    await install.prompt();
    expect([shown, offer.prompt.mock.calls.length, button.style.display]).toEqual([['', true], 1, 'none']);
  });

  it('does nothing on a click without an offer, and offers only once', async () => {
    const { install, button } = setup();
    await install.prompt();
    const offer = new FakeInstallPrompt();
    install.offer(offer);
    await install.prompt();
    await install.prompt();
    expect([offer.prompt.mock.calls.length, button.style.display]).toEqual([1, 'none']);
  });

  it('hides the button and toasts once the app is installed', () => {
    const { install, button, toasts } = setup();
    install.offer(new FakeInstallPrompt());
    install.installed();
    expect([button.style.display, toasts]).toEqual(['none', [he.install.done]]);
  });
});
