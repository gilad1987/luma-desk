import { requireChild } from '../../dom';
import type { SheetRowView } from './sheetCells';

/**
 * One built sheet row and what it last showed. The sheet repaints on the slow tick; writing only the values that
 * changed keeps 405 rows from re-laying out every 400 ms.
 */
export class SheetRow {
  readonly #tr: HTMLTableRowElement;
  readonly #swatch: HTMLElement;
  readonly #shown = new Map<string, string>();

  constructor(tr: HTMLTableRowElement) {
    this.#tr = tr;
    this.#swatch = requireChild(tr, '.cs');
  }

  /** Writes `view`, in the original order: row class, then per cell text and class, the color class, the swatch. */
  show(view: SheetRowView): void {
    this.#put('sel', view.rowClass, (v) => (this.#tr.className = v));
    for (const [n, text, cls] of view.cells) {
      this.#put('t' + n, text, (v) => (this.#cell(n).textContent = v));
      this.#put('c' + n, cls, (v) => (this.#cell(n).className = v));
    }
    this.#put('c5', view.colorClass, (v) => (this.#cell(5).className = v));
    this.#put('sw', view.swatch, (v) => (this.#swatch.style.background = v));
  }

  #put(key: string, value: string, write: (v: string) => void): void {
    if (this.#shown.get(key) === value) return;
    this.#shown.set(key, value);
    write(value);
  }

  #cell(n: number): HTMLTableCellElement {
    const cell = this.#tr.cells[n];
    if (!cell) throw new Error(`sheet row has no cell ${n}`);
    return cell;
  }
}
