import { PHASER_TYPES, type PhaserType } from '../../../../engine/shared';
import { createElement } from '../../../shared';
import { buttonGrid } from './buttonGrid';
import type { ExtraContext } from './ExtraContext';
import { labelled } from './labelled';

/** Phaser extras: one button per phaser template, then removal and phase spread presets for the selection. */
export function fxExtra(host: HTMLElement, { deps, actions }: ExtraContext): void {
  const { programmer, selection } = deps;
  const templates = createElement('div', 'fxGrid');
  for (const k of Object.keys(PHASER_TYPES) as PhaserType[]) {
    const b = createElement('button', '', PHASER_TYPES[k].name);
    b.onclick = () => programmer.applyPhaser(k);
    templates.appendChild(b);
  }
  host.appendChild(
    labelled('Phaser templates — applied to the selection, ordered by selection (Phase = spread)', templates),
  );
  const phase = (v: number) => () => actions.abs('spread', v);
  host.appendChild(
    labelled(
      'Selection',
      buttonGrid(1, [
        ['Remove Phasers', () => programmer.removePhasers(selection.ids)],
        ['Phase 0°', phase(0)],
        ['Phase 360°', phase(360)],
        ['Phase 720°', phase(720)],
      ]),
    ),
  );
}
