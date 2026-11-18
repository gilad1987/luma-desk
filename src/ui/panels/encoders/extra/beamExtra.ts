import { buttonGrid } from './buttonGrid';
import type { ExtraContext } from './ExtraContext';
import { labelled } from './labelled';

/** Beam extras: the three beam presets (5.x), strobe speeds and knockout. */
export function beamExtra(host: HTMLElement, { deps, actions }: ExtraContext): void {
  const preset = (n: number) => () => deps.programmer.applyPreset(5, n);
  const strobe = (v: number) => () => actions.abs('strobe', v);
  host.appendChild(
    labelled(
      'Beam / Shutter',
      buttonGrid(3, [
        ['Narrow', preset(1)],
        ['Medium', preset(2)],
        ['Wide', preset(3)],
        ['Strobe Slow', strobe(25)],
        ['Strobe Fast', strobe(80)],
        ['Open', strobe(0)],
        ['Knockout', () => actions.knockout('beam')],
      ]),
    ),
  );
}
