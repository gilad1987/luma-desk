import type { AppState } from '../engine/AppState';
import type { EngineBus } from '../engine/events';
import type { ExecutorPool } from '../engine/ExecutorPool';
import { decodeMidiMessage, type MidiAction } from './midiMessage';

/** The part of a `MIDIInput` the desk uses: its message handler. */
interface MidiInputPort {
  onmidimessage: ((event: MIDIMessageEvent) => void) | null;
}

/** The part of `MIDIAccess` the desk uses, so tests can hand in a fake. */
export interface MidiPorts {
  readonly inputs: { forEach(callback: (input: MidiInputPort) => void): void };
  onstatechange: ((event: MIDIConnectionEvent) => void) | null;
}

/** Where Web MIDI comes from (`navigator`); the method is optional because Safari and Firefox lack it. */
export interface MidiHost {
  requestMIDIAccess?: () => Promise<MidiPorts>;
}

/** What {@link Midi} needs from main.ts. */
export interface MidiDeps {
  readonly host: MidiHost;
  /** `#midiBtn`; it gets the `on` class once access is granted. */
  readonly button: { readonly classList: Pick<DOMTokenList, 'add'> };
  readonly pool: Pick<ExecutorPool, 'execs' | 'setLevel' | 'go'>;
  readonly state: Pick<AppState, 'gm'>;
  readonly bus: EngineBus;
}

/**
 * Web MIDI control: CC 1-10 move the faders, CC 0 the grand master, notes 36-45 press GO (see `decodeMidiMessage`).
 * It owns no DOM wiring: main.ts forwards `#midiBtn` clicks to {@link Midi.connect}. Emits `message` toasts.
 */
export class Midi {
  readonly #deps: MidiDeps;

  constructor(deps: MidiDeps) {
    this.#deps = deps;
  }

  /**
   * Asks the browser for MIDI access and listens to every input, again whenever a device is plugged in or out. Each
   * call asks again, with no guard, as the original button did.
   */
  async connect(): Promise<void> {
    const { host, button } = this.#deps;
    if (!host.requestMIDIAccess) {
      this.#toast('Web MIDI is not available in this browser');
      return;
    }
    try {
      const access = await host.requestMIDIAccess();
      const count = this.#bindInputs(access);
      access.onstatechange = () => this.#bindInputs(access);
      button.classList.add('on');
      this.#toast(count ? `MIDI: ${count} input(s) connected` : 'MIDI enabled — no devices found yet');
    } catch {
      this.#toast('MIDI blocked here — open the page in its own tab in Chrome');
    }
  }

  /** Points every input's handler at the desk and returns how many inputs there are. */
  #bindInputs(access: MidiPorts): number {
    let count = 0;
    access.inputs.forEach((input) => {
      count++;
      input.onmidimessage = (event) => {
        // the browser always sends bytes; a null payload has nothing to decode
        const action = event.data ? decodeMidiMessage(event.data) : undefined;
        if (action) this.#apply(action);
      };
    });
    return count;
  }

  #apply(action: MidiAction): void {
    const { pool, state } = this.#deps;
    if (action.kind === 'grandMaster') {
      state.gm = action.level;
      return;
    }
    const exec = pool.execs[action.execIndex];
    if (!exec) return;
    if (action.kind === 'level') pool.setLevel(exec, action.level);
    else pool.go(exec, 1);
  }

  #toast(text: string): void {
    this.#deps.bus.emit('message', { kind: 'toast', text });
  }
}
