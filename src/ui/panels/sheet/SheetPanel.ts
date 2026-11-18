import type { StageDesign } from '../../../domain/stage/StageDesign';
import type { Programmer } from '../../../engine/Programmer';
import type { Selection } from '../../../engine/Selection';
import { byId } from '../../dom';
import type { SideTab } from '../side/sideTabsMarkup';
import type { UiPanel } from '../UiPanel';
import { sheetRowView, sheetTable } from './sheetCells';
import { NO_DMX, sheetDmxById } from './sheetDmx';
import type { SheetFixture } from './SheetFixture';
import { sheetMarkup } from './sheetMarkup';
import { SheetRow } from './SheetRow';

/** What the sheet lists and reads each repaint. */
export interface SheetDeps {
  readonly fixtures: readonly SheetFixture[];
  readonly programmer: Programmer;
  readonly selection: Selection;
  /** The visible side pane; the sheet repaints only while it is the sheet. */
  readonly sideTab: () => SideTab;
  /** The current stage design, read on each repaint so the DMX columns follow an import or a stage edit. */
  readonly stageDesign: () => StageDesign;
}

/**
 * The Fixture Sheet: one row per fixture with its live values. Polled on the slow tick while its pane shows, because
 * the values change every frame; rows are built only when the fixture count changes.
 */
export class SheetPanel implements UiPanel {
  readonly #deps: SheetDeps;
  readonly #table: HTMLElement;
  #rows: SheetRow[] | null = null;

  /** Renders the pane at the end of `host` (`#side`, after Sequence); a row click selects (Shift toggles). */
  constructor(host: HTMLElement, deps: SheetDeps) {
    this.#deps = deps;
    host.insertAdjacentHTML('beforeend', sheetMarkup);
    this.#table = byId('sheet');
    this.#table.onclick = (ev) => {
      const tr = ev.target instanceof Element ? ev.target.closest<HTMLElement>('tr[data-id]') : null;
      if (tr) deps.selection.set([Number(tr.dataset['id'])], ev.shiftKey ? 'toggle' : 'replace');
    };
  }

  /** The sheet is polled, not evented: its values change every frame, so it repaints on the slow tick while shown. */
  slow(): void {
    if (this.#deps.sideTab() === 'sheet') this.render();
  }

  /** Writes every row's current values, building the rows first when the fixture count changed. */
  render(): void {
    const { fixtures, programmer, selection } = this.#deps;
    if (!this.#rows || this.#rows.length !== fixtures.length) {
      this.#table.innerHTML = sheetTable(fixtures);
      const built = this.#table.querySelectorAll<HTMLTableRowElement>('tr[data-id]');
      this.#rows = Array.from(built, (tr) => new SheetRow(tr));
    }
    const rows = this.#rows;
    const dmx = sheetDmxById(this.#deps.stageDesign());
    fixtures.forEach((f, i) => {
      rows[i]?.show(sheetRowView(f, selection.has(f.id), programmer.vals[f.id] ?? {}, dmx.get(f.id) ?? NO_DMX));
    });
  }
}
