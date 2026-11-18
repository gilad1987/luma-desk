import { GOBO_NAMES, SCREEN_MODES } from '../../../../domain/attributes';
import { createElement } from '../../../shared';
import { buttonGrid } from './buttonGrid';
import type { ExtraContext } from './ExtraContext';
import { labelled } from './labelled';

/** The wheel row: LED content modes when the first selected fixture is a screen, else the gobo slots with icons. */
function wheelRow({ deps, actions }: ExtraContext, isScreen: boolean): HTMLDivElement {
  const row = createElement('div', 'goboRow');
  if (isScreen)
    SCREEN_MODES.forEach((n, i) => {
      const b = createElement('button', '', `<span style="font-size:11px">${n}</span>`);
      b.style.width = '70px';
      b.onclick = () => actions.abs('gobo', i);
      row.appendChild(b);
    });
  else
    GOBO_NAMES.forEach((n, i) => {
      const b = createElement('button', '', `<img src="${deps.goboIcons[i]}">${n}`);
      b.onclick = () => actions.abs('gobo', i);
      row.appendChild(b);
    });
  return row;
}

/** Gobo extras: the wheel (decided once per render, quirk Q9) and the rotation buttons. */
export function goboExtra(host: HTMLElement, ctx: ExtraContext): void {
  const { deps, actions } = ctx;
  const first = deps.selection.ids[0];
  const isScreen = first !== undefined && deps.rig.get(first)?.type === 'screen';
  host.appendChild(labelled(isScreen ? 'LED screen content' : 'Gobo wheel', wheelRow(ctx, isScreen)));
  const rot = (v: number) => () => actions.abs('grot', v);
  host.appendChild(
    labelled(
      'Rotation',
      buttonGrid(2, [
        ['◀ Fast', rot(-60)],
        ['Fast ▶', rot(60)],
        ['◀ Slow', rot(-12)],
        ['Slow ▶', rot(12)],
        ['Stop', rot(0)],
        ['Knockout', () => actions.knockout('gobo')],
      ]),
    ),
  );
}
