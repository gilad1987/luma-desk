import type { Executor } from '../../../engine/Executor';
import { requireChild } from '../../dom';
import type { SequenceDeps } from './SequenceDeps';

/**
 * Wires the rows `cueTable` built: click goes to the cue (or merges the programmer into it in store mode), double-click
 * on the name renames, on the fade asks for a new fade time.
 */
export function wireCueRows(table: HTMLElement, e: Executor, deps: SequenceDeps): void {
  const { bus, modal } = deps;
  const edited = (): void => {
    bus.emit('stateDirty', undefined);
    bus.emit('showChanged', undefined);
  };
  table.querySelectorAll<HTMLTableRowElement>('tr[data-i]').forEach((tr) => {
    const i = Number(tr.dataset['i']),
      c = e.cues[i];
    if (!c) return;
    tr.onclick = (ev) => {
      // a double-click must not goto again (quirk Q12)
      if (ev.detail > 1) return;
      if (deps.store.intercept(() => deps.programmer.storeCue(deps.state.selExec, c.num, { merge: true }))) return;
      if (!e.on && e.level === 0) e.level = 1;
      e.goto(i);
      bus.emit('stateDirty', undefined);
    };
    requireChild(tr, '.name').ondblclick = () =>
      modal.rename(`Cue ${c.num}`, c.name, (v) => {
        c.name = v;
        edited();
      });
    requireChild(tr, '.fade').ondblclick = () =>
      modal.number(`Fade time for cue ${c.num} (s)`, (v) => {
        c.fade = Math.max(0, v);
        edited();
      });
  });
}
