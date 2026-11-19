import { he } from '../../../i18n/he';
import { byId } from '../../dom';
import type { Modal } from '../../shared';
import { fillLayerList, type MvrLayerListContent } from './layerList';

/** The dialog body: fixed text only. The layer names come from the file, so `fillLayerList` writes them as text. */
const MARKUP = `<button class="close" id="mvrLayersClose" aria-label="Close">✕</button>
  <h2 title="${he.mvr.layersTip}">MVR layers</h2>
  <div class="mvrSummary"><div id="mvrLayers" class="mvrLayers"></div></div>`;

/**
 * True when the "Layers" dialog may open now: the modal is closed, or it already shows this dialog. Another dialog
 * (an import summary, a show save) keeps its state, so the dialog does not replace it.
 */
export function mayOpenMvrLayers(modal: Pick<Modal, 'isOpen'>): boolean {
  return !modal.isOpen() || document.getElementById('mvrLayersClose') !== null;
}

/**
 * Opens the layer list of the MVR stage now drawn in the shared modal: the same rows and controls as the list of the
 * import summary, at any time. The summary opens once, after an import, and not at all after a reload; without this
 * dialog a hidden layer could then not be shown again and an LED mark could not be taken off. The focus goes to the
 * first control of the list, so a keyboard user starts in it. It returns the list's host, which leaves the page when
 * the modal shows another dialog.
 */
export function openMvrLayers(
  modal: Pick<Modal, 'open' | 'close'>,
  content: MvrLayerListContent,
  onHiddenLayers: (uuids: readonly string[]) => void,
): HTMLElement {
  modal.open(MARKUP);
  byId('mvrLayersClose').onclick = () => modal.close();
  const host = byId('mvrLayers');
  fillLayerList(host, content, onHiddenLayers);
  host.querySelector<HTMLElement>('input, select, button')?.focus();
  return host;
}
