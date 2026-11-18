import type { AppState } from '../../engine/AppState';
import type { EngineBus } from '../../engine/events';
import type { ExecutorPool } from '../../engine/ExecutorPool';
import { Midi } from '../../io/Midi';
import { byId } from '../../ui/dom';

/** The main.ts objects the MIDI button drives, named after the main.ts variables they replace. */
export interface MidiWiringDeps {
  readonly pool: Pick<ExecutorPool, 'execs' | 'setLevel' | 'go'>;
  readonly appState: Pick<AppState, 'gm'>;
  readonly bus: EngineBus;
}

/**
 * Connects `#midiBtn` to Web MIDI. Nothing happens at boot: the browser asks for MIDI access only on the click, as the
 * original button did, so a page that never uses MIDI never sees the permission prompt.
 */
export function wireMidi(deps: MidiWiringDeps): Midi {
  const button = byId('midiBtn');
  const midi = new Midi({ host: navigator, button, pool: deps.pool, state: deps.appState, bus: deps.bus });
  button.onclick = () => void midi.connect();
  return midi;
}
