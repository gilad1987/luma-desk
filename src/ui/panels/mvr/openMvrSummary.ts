import type { MvrLayer } from '../../../domain/stage/mvr';
import { byId } from '../../dom';
import { createElement, type Modal } from '../../shared';
import type { ImportSummaryView } from './importSummaryView';
import { mvrSummaryMarkup } from './mvrSummaryMarkup';

/** What the summary dialog shows after one import. */
export interface MvrSummaryContent {
  readonly view: ImportSummaryView;
  /** The layers of the imported file, in file order; one checkbox each. */
  readonly layers: readonly MvrLayer[];
  /** The uuids of the layers the design hides; their boxes start unchecked. */
  readonly hiddenLayers: readonly string[];
}

/** One layer row: a checkbox and the layer name as text; `dir="auto"` because names are Hebrew or Latin. */
function layerRow(host: HTMLElement, layer: MvrLayer, hidden: readonly string[]): HTMLInputElement {
  const row = createElement('label', 'mvrLayer');
  row.dir = 'auto';
  const box = createElement('input');
  box.type = 'checkbox';
  box.checked = !hidden.includes(layer.uuid);
  const name = createElement('span');
  name.textContent = layer.name;
  row.appendChild(box);
  row.appendChild(name);
  host.appendChild(row);
  return box;
}

/** The warning lines shown before the "Show all" toggle, so a long list does not push the layers out of view. */
const SHOWN_WARNINGS = 8;

/** The last list line: a button that shows the hidden `lines` and then removes itself. */
function showAllToggle(host: HTMLElement, lines: readonly HTMLElement[]): void {
  const row = createElement('li', 'mvrShowAll');
  const button = createElement('button');
  button.textContent = `Show all (${lines.length})`;
  button.onclick = () => {
    for (const line of lines) line.hidden = false;
    row.remove();
  };
  row.appendChild(button);
  host.appendChild(row);
}

/** Fills the warning list, one text line per warning; lines past `SHOWN_WARNINGS` wait behind a toggle. */
function fillWarnings(host: HTMLElement, warnings: readonly string[]): void {
  const lines = warnings.map((warning, index) => {
    const line = createElement('li');
    line.textContent = warning;
    if (index >= SHOWN_WARNINGS) line.hidden = true;
    host.appendChild(line);
    return line;
  });
  if (lines.length > SHOWN_WARNINGS) showAllToggle(host, lines);
}

/**
 * Opens the import summary in the shared modal (plan §6, `ImportSummary`) with a layer list. Every box change reports
 * the full list of hidden layer uuids, so the caller saves and shows one consistent state.
 */
export function openMvrSummary(
  modal: Pick<Modal, 'open' | 'close'>,
  content: MvrSummaryContent,
  onHiddenLayers: (uuids: readonly string[]) => void,
): void {
  modal.open(mvrSummaryMarkup(content.view, content.layers.length));
  byId('mvrSummaryClose').onclick = () => modal.close();
  fillWarnings(byId('mvrWarnings'), content.view.warnings);
  const host = byId('mvrLayers');
  const rows = content.layers.map((layer) => ({ layer, box: layerRow(host, layer, content.hiddenLayers) }));
  const hiddenNow = (): string[] => rows.filter(({ box }) => !box.checked).map(({ layer }) => layer.uuid);
  for (const { box } of rows) box.onchange = () => onHiddenLayers(hiddenNow());
}
