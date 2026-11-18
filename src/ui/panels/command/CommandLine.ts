import type { EngineMessage } from '../../../engine/events';
import type { CommandInput } from '../../components/pressKey';
import { byId } from '../../dom';
import { createElement } from '../../shared';
import type { UiPanel } from '../UiPanel';
import { CommandHistory } from './CommandHistory';
import type { CommandLineDeps } from './CommandLineDeps';
import { commandLineMarkup } from './commandLineMarkup';
import { listenPageKeys } from './pageKeys';
import { wireKeys } from './wireKeys';

/** Lines of feedback kept under the command line. */
const FEEDBACK_LINES = 2;

/**
 * The MA-style command line: `#cmd`, its history, the feedback lines, the eight keys and the page keyboard. It is
 * the {@link CommandInput} the keypad types into, so both share one history.
 */
export class CommandLine implements CommandInput, UiPanel {
  readonly #deps: CommandLineDeps;
  readonly #input: HTMLInputElement;
  readonly #history = new CommandHistory();
  readonly #highlightKey: HTMLElement;
  readonly #fanKey: HTMLElement;

  /** Renders the command area at the start of `host` (`#desk`, before `#execs`) and wires every key. */
  constructor(host: HTMLElement, deps: CommandLineDeps) {
    this.#deps = deps;
    host.insertAdjacentHTML('afterbegin', commandLineMarkup);
    this.#input = byId('cmd', HTMLInputElement);
    this.#highlightKey = byId('kHigh');
    this.#fanKey = byId('kFan');
    const feedback = byId('cmdFb');
    deps.bus.on('message', (m: EngineMessage) => {
      if (m.kind !== 'log') return;
      // names in the text are not escaped (quirk Q11, quirk C6, orig:1888)
      feedback.appendChild(createElement('div', '', `<span class="${m.level}">${m.text}</span>`));
      while (feedback.children.length > FEEDBACK_LINES) feedback.firstChild?.remove();
    });
    this.#input.onkeydown = (ev) => this.#key(ev);
    wireKeys(this.#input, deps);
    listenPageKeys(this.#input, deps);
  }

  get value(): string {
    return this.#input.value;
  }

  set value(v: string) {
    this.#input.value = v;
  }

  pushHistory(entry: string, resetIndex: boolean): void {
    this.#history.push(entry, resetIndex);
  }

  run(command: string): void {
    this.#deps.runCommand(command);
  }

  /** Lights HIGHLT and FAN from the engine flags on the 50 ms tick (their clicks do not, quirk Q10, orig:2539). */
  fast(): void {
    this.#highlightKey.classList.toggle('on', this.#deps.state.highlight);
    this.#fanKey.classList.toggle('on', this.#deps.state.fanMode);
  }

  #key(ev: KeyboardEvent): void {
    const input = this.#input;
    if (ev.key === 'Enter') {
      const v = input.value;
      if (v.trim()) this.#history.push(v, true);
      // a bare `store` arms store mode and keeps the Enter default (quirk Q15, orig:2260)
      if (this.#deps.store.takeStoreCommand(v)) {
        input.value = '';
        return;
      }
      this.run(v);
      input.value = '';
      ev.preventDefault();
    } else if (ev.key === 'Escape') {
      input.value = '';
      input.blur();
      this.#deps.store.set(false);
    } else if (ev.key === 'ArrowUp') {
      const entry = this.#history.older();
      if (entry) input.value = entry;
      ev.preventDefault();
    } else if (ev.key === 'ArrowDown') {
      input.value = this.#history.newer();
      ev.preventDefault();
    }
  }
}
