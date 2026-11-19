import { byId } from '../../dom';
import { createElement, type Modal } from '../../shared';
import type { ImportSummaryView } from './importSummaryView';
import { fillLayerList, type MvrLayerListContent } from './layerList';
import { mvrSummaryMarkup } from './mvrSummaryMarkup';
import { wireShowChoice } from './wireShowChoice';

/** What the summary dialog shows after one import. */
export interface MvrSummaryContent extends MvrLayerListContent {
  readonly view: ImportSummaryView;
  /**
   * Present when the import kept the operator's cues: the summary then offers to build the starting show for the rig
   * instead (the default button) or to keep the cues. Missing: the summary offers no choice.
   */
  readonly buildShow?: (() => void) | undefined;
}

/** The warning lines shown before the "Show all" toggle, so a long list does not push the layers out of view. */
const SHOWN_WARNINGS = 8;

/**
 * The last list line: a button that shows the hidden `lines` and then removes itself. The focus moves to the first
 * line it revealed first, so the keyboard does not fall back to the page when the focused button goes.
 */
function showAllToggle(host: HTMLElement, lines: readonly HTMLElement[]): void {
  const row = createElement('li', 'mvrShowAll');
  const button = createElement('button');
  button.textContent = `Show all (${lines.length})`;
  button.onclick = () => {
    for (const line of lines) line.hidden = false;
    const firstRevealed = lines[SHOWN_WARNINGS];
    if (firstRevealed !== undefined) {
      firstRevealed.tabIndex = -1;
      firstRevealed.focus();
    }
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
 * the full list of hidden layer uuids, so the caller saves and shows one consistent state. It returns the list's host,
 * which leaves the page when the modal shows another dialog.
 */
export function openMvrSummary(
  modal: Pick<Modal, 'open' | 'close'>,
  content: MvrSummaryContent,
  onHiddenLayers: (uuids: readonly string[]) => void,
): HTMLElement {
  modal.open(mvrSummaryMarkup(content.view, content.layers.length, content.buildShow !== undefined));
  byId('mvrSummaryClose').onclick = () => modal.close();
  if (content.buildShow) wireShowChoice(content.buildShow);
  fillWarnings(byId('mvrWarnings'), content.view.warnings);
  fillWarnings(byId('mvrBodies'), content.view.bodies);
  const host = byId('mvrLayers');
  fillLayerList(host, content, onHiddenLayers);
  return host;
}
