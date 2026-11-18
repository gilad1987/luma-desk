import { createElement } from '../../../shared';
import { buttonGrid } from './buttonGrid';
import type { ExtraContext } from './ExtraContext';
import { labelled } from './labelled';

const HINT =
  'Drag the encoder up/down (Shift = fine), mouse-wheel, or double-click the value to type. ' +
  'Command line: <b>At 75</b>, <b>Full</b>.';

/** Dimmer extras: quick levels, knockout and the encoder hint. */
export function dimExtra(host: HTMLElement, { actions }: ExtraContext): void {
  const level = (v: number) => () => actions.abs('dim', v);
  host.appendChild(
    labelled(
      'Quick level',
      buttonGrid(6, [
        ['Full', level(100)],
        ['75', level(75)],
        ['50', level(50)],
        ['25', level(25)],
        ['10', level(10)],
        ['Zero', level(0)],
      ]),
    ),
  );
  host.appendChild(labelled('Programmer', buttonGrid(1, [['Knockout Dimmer', () => actions.knockout('dim')]])));
  host.appendChild(createElement('div', 'hint', HINT));
}
