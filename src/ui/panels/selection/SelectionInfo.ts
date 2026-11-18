import type { Programmer } from '../../../engine/Programmer';
import type { Selection } from '../../../engine/Selection';
import { byId } from '../../dom';
import type { UiPanel } from '../UiPanel';
import { programmerChip, selectionChip } from './selectionChips';

/**
 * The two chips over the viewer that say what the operator is working on: the selection and the programmer. Its own
 * panel because it reports engine state, not anything the viewer or the command line does; the chips' markup belongs
 * to the viewer (`#vhud`), so this panel only looks them up.
 */
export class SelectionInfo implements UiPanel {
  readonly #selection: Selection;
  readonly #programmer: Programmer;
  readonly #selChip = byId('selInfo');
  readonly #progChip = byId('progInfo');

  constructor(selection: Selection, programmer: Programmer) {
    this.#selection = selection;
    this.#programmer = programmer;
  }

  /** Rewrites both chips on the 50 ms tick, as the original loop did. */
  fast(): void {
    this.#selChip.innerHTML = selectionChip(this.#selection.ids);
    const p = this.#programmer;
    this.#progChip.innerHTML = programmerChip(Object.keys(p.vals).length, p.fxList.length);
  }
}
