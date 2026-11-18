import { byId } from '../../../dom';
import { createElement } from '../../../shared';
import { focusPad } from '../../../components/FocusPad';
import { buttonGrid } from './buttonGrid';
import type { ExtraContext } from './ExtraContext';
import { labelled, xlabel } from './labelled';

/** The aim height slider; it writes the shared height every focus pad aims at. */
function aimSlider({ deps }: ExtraContext): HTMLInputElement {
  const slider = createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '12';
  slider.step = '0.1';
  slider.value = String(deps.aimHeight.value);
  slider.style.width = '120px';
  slider.oninput = () => (deps.aimHeight.value = +slider.value);
  return slider;
}

/** Position extras: the focus pad (not in MA, which has its own), aim height, Home, Knockout, Fan and Center. */
export function positionExtra(host: HTMLElement, ctx: ExtraContext): void {
  const { deps, actions, rerender } = ctx;
  const { state, programmer, selection } = deps;
  if (deps.layoutMode() !== 'ma') {
    const pad = createElement('canvas', 'pad');
    pad.width = 300;
    pad.height = 118;
    host.appendChild(labelled('Focus pad — click/drag on the stage map to aim selection', pad));
    focusPad(pad, deps);
  }
  const home = (): void =>
    selection.ids.forEach((id) => {
      programmer.set(id, 'pan', 0);
      programmer.set(id, 'tilt', 0);
    });
  const fan = (): void => {
    state.fanMode = !state.fanMode;
    byId('kFan').classList.toggle('on', state.fanMode); // quirk G3, quirk Q10 (orig:2101)
    rerender();
  };
  const grid = buttonGrid(2, [
    ['Home', home],
    ['Knockout', () => actions.knockout('pos')],
    ['Fan ' + (state.fanMode ? 'ON' : 'off'), fan, state.fanMode ? 'on' : ''],
    ['Center', () => programmer.applyPreset(2, 2)],
  ]);
  host.appendChild(labelled('Aim height', aimSlider(ctx), xlabel('&nbsp;'), grid));
}
