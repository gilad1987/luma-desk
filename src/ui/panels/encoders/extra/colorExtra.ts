import { cssRgb } from '../../../../core';
import { COLORS } from '../../../../engine/presetColors';
import { createElement } from '../../../shared';
import { colorPad } from '../../../components/ColorPad';
import { buttonGrid } from './buttonGrid';
import type { ExtraContext } from './ExtraContext';
import { labelled, xlabel } from './labelled';

/** One clickable swatch per colour preset; a click sets the colour on the colour targets. */
function swatches({ deps }: ExtraContext): HTMLDivElement {
  const { programmer } = deps;
  const row = createElement('div', 'swatches');
  COLORS.forEach(([n, r, g, b]) => {
    const d = createElement('div');
    d.title = n;
    d.style.background = cssRgb(r, g, b);
    d.onclick = () =>
      programmer.colorTargets().forEach((id) => {
        programmer.set(id, 'r', r);
        programmer.set(id, 'g', g);
        programmer.set(id, 'b', b);
      });
    row.appendChild(d);
  });
  return row;
}

/** Color extras: the picker pad (not in MA, which has its own), the swatches and knockout. */
export function colorExtra(host: HTMLElement, ctx: ExtraContext): void {
  if (ctx.deps.layoutMode() !== 'ma') {
    const pad = createElement('canvas', 'pad');
    pad.width = 230;
    pad.height = 112;
    host.appendChild(labelled('Color picker', pad));
    colorPad(pad, ctx.deps.programmer);
  }
  const knockout = buttonGrid(2, [['Knockout Color', () => ctx.actions.knockout('color')]]);
  host.appendChild(labelled('Swatches (Color presets 4.x)', swatches(ctx), xlabel('&nbsp;'), knockout));
}
