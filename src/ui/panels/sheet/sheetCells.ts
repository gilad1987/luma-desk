import { cssRgb } from '../../../core';
import type { AttrName, AttrValues } from '../../../domain/attributes';
import type { SheetFixture } from './SheetFixture';

/** The header and one row per fixture in rig build order (never sorted); the cells are filled by the tick. */
export function sheetTable(fixtures: readonly SheetFixture[]): string {
  const header =
    '<tr><th>ID</th><th>Type</th><th>Dim</th><th>Pan</th>' + '<th>Tilt</th><th>Col</th><th>Gobo</th><th>Zoom</th></tr>';
  const row = (f: SheetFixture): string =>
    `<tr data-id="${f.id}"><td>${f.id}</td><td style="font-family:Inter">${f.T.name}</td>` +
    `<td></td><td></td><td></td><td><span class="cs"></span></td><td></td><td></td></tr>`;
  return header + fixtures.map(row).join('');
}

/** What one row shows: the row class, then per cell (by column) its text and its class (`p` = in programmer). */
export interface SheetRowView {
  readonly rowClass: string;
  readonly cells: readonly (readonly [column: number, text: string, className: string])[];
  readonly colorClass: string;
  readonly swatch: string;
}

/**
 * The values row `f` shows now; `prog` is the fixture's programmer values (empty when it has none). A value the
 * fixture has not output yet reads as NaN, so the cell shows "NaN" as the old `Math.round(undefined)` did.
 */
export function sheetRowView(f: SheetFixture, selected: boolean, prog: AttrValues): SheetRowView {
  const base = f.base;
  const inProg = (a: AttrName): string => (prog[a] !== undefined && prog[a] !== null ? 'p' : '');
  const rounded = (v: number | undefined): string => String(Math.round(v ?? NaN));
  const cells: (readonly [number, string, AttrName])[] = [
    [2, rounded(f.out.dim), 'dim'],
    [3, f.has('pan') ? rounded(base.pan) : '', 'pan'],
    [4, f.has('tilt') ? rounded(base.tilt) : '', 'tilt'],
    [6, f.has('gobo') ? rounded(base.gobo) : '', 'gobo'],
    [7, f.has('zoom') ? (base.zoom ?? NaN).toFixed(1) : '', 'zoom'],
  ];
  return {
    rowClass: selected ? 'sel' : '',
    cells: cells.map(([n, text, a]) => [n, text, inProg(a)] as const),
    colorClass: inProg('r'),
    swatch: f.has('r') ? cssRgb(base.r ?? NaN, base.g ?? NaN, base.b ?? NaN) : '#333',
  };
}
