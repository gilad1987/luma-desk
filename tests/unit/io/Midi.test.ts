/** Owns the MIDI button flow: the access guard, input binding, rebinding on device change and the toasts. */
import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../src/core';
import { AppState } from '../../../src/engine/AppState';
import type { EngineEvents, EngineMessage } from '../../../src/engine/events';
import { ExecutorPool } from '../../../src/engine/ExecutorPool';
import { Midi, type MidiHost, type MidiPorts } from '../../../src/io/Midi';

class FakeMidiMessage extends Event {
  readonly data: Uint8Array<ArrayBuffer>;
  constructor(data: Uint8Array<ArrayBuffer>) {
    super('midimessage');
    this.data = data;
  }
}

class FakeConnectionEvent extends Event {
  readonly port = null;
}

interface FakeInput {
  onmidimessage: ((event: MIDIMessageEvent) => void) | null;
}

function setup(host: MidiHost) {
  const bus = new EventBus<EngineEvents>();
  const toasts: string[] = [];
  bus.on('message', (message: EngineMessage) => toasts.push(message.text));
  const pool = new ExecutorPool({ nowMs: () => 0, nowSeconds: () => 0 }, bus);
  const setLevel = vi.fn(),
    go = vi.fn();
  const state = new AppState(bus);
  const classes = new Set<string>();
  const button = { classList: { add: (...tokens: string[]) => tokens.forEach((t) => classes.add(t)) } };
  const midi = new Midi({ host, button, pool: { execs: pool.execs, setLevel, go }, state, bus });
  return { midi, toasts, setLevel, go, state, classes, execs: pool.execs };
}

function send(input: FakeInput, bytes: number[]): void {
  input.onmidimessage?.(new FakeMidiMessage(new Uint8Array(bytes)));
}

describe('Midi', () => {
  it('toasts and stays off when the browser has no Web MIDI', async () => {
    const { midi, toasts, classes } = setup({});
    await midi.connect();
    expect([toasts, [...classes]]).toEqual([['Web MIDI is not available in this browser'], []]);
  });

  it('binds every input and drives faders, GO and the grand master', async () => {
    const input: FakeInput = { onmidimessage: null };
    const access: MidiPorts = { inputs: new Map([['in-1', input]]), onstatechange: null };
    const { midi, toasts, classes, setLevel, go, state, execs } = setup({
      requestMIDIAccess: () => Promise.resolve(access),
    });
    await midi.connect();
    send(input, [0xb1, 3, 127]);
    send(input, [0x90, 40, 90]);
    send(input, [0xb0, 0, 0]);
    expect([toasts, [...classes], setLevel.mock.calls, go.mock.calls, state.gm]).toEqual([
      ['MIDI: 1 input(s) connected'],
      ['on'],
      [[execs[2], 1]],
      [[execs[4], 1]],
      0,
    ]);
  });

  it('reports no devices, then binds a device plugged in later', async () => {
    const inputs = new Map<string, FakeInput>();
    const access: MidiPorts = { inputs, onstatechange: null };
    const { midi, toasts, go, execs } = setup({ requestMIDIAccess: () => Promise.resolve(access) });
    await midi.connect();
    const input: FakeInput = { onmidimessage: null };
    inputs.set('in-1', input);
    access.onstatechange?.(new FakeConnectionEvent('statechange'));
    send(input, [0x90, 36, 1]);
    expect([toasts, go.mock.calls]).toEqual([['MIDI enabled — no devices found yet'], [[execs[0], 1]]]);
  });

  it('toasts when the browser blocks access and asks again on the next click', async () => {
    const requestMIDIAccess = vi.fn(() => Promise.reject(new Error('SecurityError')));
    const { midi, toasts, classes } = setup({ requestMIDIAccess });
    await midi.connect();
    await midi.connect();
    expect([toasts.length, toasts[0], requestMIDIAccess.mock.calls.length, [...classes]]).toEqual([
      2,
      'MIDI blocked here — open the page in its own tab in Chrome',
      2,
      [],
    ]);
  });
});
