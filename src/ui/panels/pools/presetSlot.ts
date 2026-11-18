import { cssRgb } from '../../../core';
import type { PresetType } from '../../../engine/presetTypes';
import type { PresetTarget } from '../../../engine/stage/presetTargets';
import { he } from '../../../i18n/he';
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
  if (pr && type === 3 && 'gobo' in pr && pr.gobo !== undefined && pr.gobo !== null) {
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
  const missing = deps.presets.missingTarget(type, n);
  if (missing) return unavailableSlot(type, n, missing);
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

/**
 * A computed preset that aims at a part this stage lacks (G10): drawn as an empty slot with no click, so it can be
 * neither applied nor overwritten; the title names the missing part. On the built-in stage every preset is available.
 */
function unavailableSlot(type: PresetType, n: number, missing: PresetTarget): HTMLDivElement {
  const slot = createElement(
    'div',
    'slot empty is-unavailable',
    `<span class="n">${type}.${n}</span><span class="t">—</span>`,
  );
  slot.title = he.builder.presetMissing[missing];
  return slot;
}
