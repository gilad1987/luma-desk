/** Checks that `#midiBtn` reaches Web MIDI and that a MIDI message reaches the real pool and grand master. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireMidi } from '../../../../src/app/io/wireMidi';
import { EventBus, performanceClock } from '../../../../src/core';
import { AppState } from '../../../../src/engine/AppState';
import type { EngineEvents, EngineMessage } from '../../../../src/engine/events';
import { ExecutorPool } from '../../../../src/engine/ExecutorPool';
import { FakeDom } from '../../../shared/dom';

type MessageHandler = ((event: { readonly data: Uint8Array }) => void) | null;

function setup(host: object) {
  vi.stubGlobal('navigator', host);
  const dom = new FakeDom();
  const button = dom.add('midiBtn');
  const bus = new EventBus<EngineEvents>();
  const toasts: string[] = [];
  bus.on('message', (message: EngineMessage) => toasts.push(message.text));
  const pool = new ExecutorPool(performanceClock, bus);
  const appState = new AppState(bus);
  wireMidi({ pool, appState, bus });
  const click = (): void => button.onclick?.({ target: button });
  return { button, toasts, pool, appState, click };
}

describe('wireMidi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks for nothing at boot and toasts on click when the browser has no Web MIDI', () => {
    const { toasts, click } = setup({});
    expect(toasts).toEqual([]);
    click();
    expect(toasts).toEqual(['Web MIDI is not available in this browser']);
  });

  it('binds every input on click, marks the button and drives fader 1 and the grand master', async () => {
    const input: { onmidimessage: MessageHandler } = { onmidimessage: null };
    const access = { inputs: [input], onstatechange: null };
    const { button, toasts, pool, appState, click } = setup({ requestMIDIAccess: () => Promise.resolve(access) });
    click();
    await vi.waitFor(() => expect(toasts).toEqual(['MIDI: 1 input(s) connected']));
    expect(button.classList.contains('on')).toBe(true);
    input.onmidimessage?.({ data: new Uint8Array([0xb0, 1, 127]) });
    input.onmidimessage?.({ data: new Uint8Array([0xb0, 0, 0]) });
    expect([pool.execs[0]?.level, appState.gm]).toEqual([1, 0]);
  });
});
