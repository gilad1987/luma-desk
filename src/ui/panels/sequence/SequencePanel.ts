import type { Executor } from '../../../engine/Executor';
import { byId } from '../../dom';
import type { UiPanel } from '../UiPanel';
import { sequenceMarkup } from './sequenceMarkup';
import type { SequenceDeps } from './SequenceDeps';
import { cueTable, execOptions } from './sequenceRows';
import { wireCueRows } from './wireCueRows';

/**
 * The Sequence pane: the cue list of the selected executor, with GO, GO−, delete and in-place edits. It is polled on
 * the slow tick while its pane shows, as before, because cue state changes on every GO and fade.
 */
export class SequencePanel implements UiPanel {
  readonly #deps: SequenceDeps;
  readonly #select: HTMLSelectElement;
  readonly #table: HTMLElement;

  /** Renders the pane at the end of `host` (`#side`, after Auto Show) and wires its buttons. */
  constructor(host: HTMLElement, deps: SequenceDeps) {
    this.#deps = deps;
    host.insertAdjacentHTML('beforeend', sequenceMarkup);
    this.#select = byId('seqSel', HTMLSelectElement);
    this.#table = byId('seqTable');
    const { bus, state, pool } = deps;
    this.#select.onchange = () => {
      state.selectExec(Number(this.#select.value));
      bus.emit('stateDirty', undefined);
    };
    byId('seqGo').onclick = () => pool.go(this.#selected(), 1);
    byId('seqBack').onclick = () => pool.go(this.#selected(), -1);
    byId('seqDel').onclick = () => {
      const e = this.#selected(),
        cue = e.cues[e.cur];
      if (!cue) bus.emit('message', { kind: 'toast', text: 'Goto the cue you want to delete first' });
      else deps.runCommand(`Delete Cue ${cue.num}`);
    };
  }

  slow(): void {
    if (this.#deps.sideTab() === 'seq') this.render();
  }

  /** Rebuilds the executor picker and the cue table of the selected executor. */
  render(): void {
    const e = this.#selected();
    this.#select.innerHTML = execOptions(this.#deps.execs, this.#deps.state.selExec);
    this.#table.innerHTML = cueTable(e);
    wireCueRows(this.#table, e, this.#deps);
  }

  #selected(): Executor {
    const e = this.#deps.execs[this.#deps.state.selExec];
    if (!e) throw new Error(`no executor ${this.#deps.state.selExec}`);
    return e;
  }
}
