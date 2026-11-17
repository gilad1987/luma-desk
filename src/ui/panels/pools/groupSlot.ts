import { createElement } from '../../shared';
import type { PoolsDeps } from './PoolsDeps';

/**
 * Group slot `n`: click selects the group (Shift adds), or stores the selection into it in store mode; double-click
 * renames. `repaint` redraws the pools after a rename.
 */
export function groupSlot(n: number, deps: PoolsDeps, repaint: () => void): HTMLDivElement {
  const g = deps.groups.all[n];
  const slot = createElement(
    'div',
    'slot grp' + (g ? '' : ' empty'),
    `<span class="n">${n}</span><span class="t">${g ? g.name : '—'}</span>`,
  );
  if (g) slot.title = `${g.ids.length} fixtures`;
  slot.onclick = (ev) => {
    if (deps.store.intercept(() => deps.groups.store(n, deps.selection.ids))) return;
    if (!g) return;
    deps.selection.set([...g.ids], ev.shiftKey ? 'add' : 'replace');
    deps.bus.emit('message', { kind: 'log', text: `Group ${n} "${g.name}" (${g.ids.length})`, level: 'ok' });
  };
  slot.ondblclick = () => {
    if (!g) return;
    deps.modal.rename(`Group ${n}`, g.name, (v) => {
      g.name = v;
      repaint();
      deps.bus.emit('showChanged', undefined);
    });
  };
  return slot;
}
