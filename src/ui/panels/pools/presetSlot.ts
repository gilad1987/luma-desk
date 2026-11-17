import { cssRgb } from '../../../core/color';
import type { PresetType } from '../../../engine/presetTypes';
import { createElement } from '../../shared';
import type { PoolsDeps } from './PoolsDeps';

/** Color pool slots show a swatch of the stored color; gobo pool slots show the gobo image. */
function decorate(slot: HTMLDivElement, type: PresetType, n: number, deps: PoolsDeps): void {
  const pr = deps.presets.all[type][n];
  if (pr && type === 4 && 'vals' in pr && pr.vals) {
    // a missing channel gives NaN in the CSS (an invalid color, so no swatch color), as the original did
    const c = cssRgb(pr.vals.r ?? NaN, pr.vals.g ?? NaN, pr.vals.b ?? NaN);
    const sw = createElement('i', 'sw');
    sw.style.background = c;
    sw.style.color = c;
    slot.appendChild(sw);
  }
  if (pr && type === 3 && 'gobo' in pr && pr.gobo != null) {
    const im = createElement('img', 'gi');
    // an index past the wheel sets the src "undefined", as the original assignment of a missing entry did
    im.src = deps.goboIcons[pr.gobo] ?? 'undefined';
    slot.appendChild(im);
  }
}

/**
 * Preset slot `type.n`: click applies it to the selection, or stores the programmer into it in store mode;
 * double-click renames. `repaint` redraws the pools after a rename.
 */
export function presetSlot(type: PresetType, n: number, deps: PoolsDeps, repaint: () => void): HTMLDivElement {
  const pr = deps.presets.all[type][n];
  const slot = createElement(
    'div',
    'slot' + (pr ? '' : ' empty'),
    `<span class="n">${type}.${n}</span><span class="t">${pr ? pr.name : '—'}</span>`,
  );
  decorate(slot, type, n, deps);
  slot.onclick = () => {
    const { presets, selection, programmer } = deps;
    if (deps.store.intercept(() => presets.storeFromProgrammer(type, n, selection.ids, programmer.vals))) return;
    if (pr) programmer.applyPreset(type, n);
  };
  slot.ondblclick = () => {
    if (!pr) return;
    deps.modal.rename(`Preset ${type}.${n}`, pr.name, (v) => {
      pr.name = v;
      repaint();
      deps.bus.emit('showChanged', undefined);
    });
  };
  return slot;
}
