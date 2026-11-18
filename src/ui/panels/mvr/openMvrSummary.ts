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

/** Fills the warning list, one text line per warning. */
function fillWarnings(host: HTMLElement, warnings: readonly string[]): void {
  for (const warning of warnings) {
    const line = createElement('li');
    line.textContent = warning;
    host.appendChild(line);
  }
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
