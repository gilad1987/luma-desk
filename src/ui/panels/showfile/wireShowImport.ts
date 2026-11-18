import type { ShowFileInput } from '../../../show/ShowFile';
import { byId } from '../../dom';
import type { ShowFileDeps } from './ShowFileDeps';

/**
 * Loads a show from JSON text and saves it; any failure (parse or load) toasts `failure` and leaves the dialog open.
 * A bad `stage` already toasted during the load; the toast shows only the latest text, so "Show loaded" is skipped
 * then and the user reads the bad-stage text.
 */
function importShow({ loadShow, storage, modal, bus }: ShowFileDeps, json: string, failure: string): void {
  try {
    const { badStage } = loadShow(JSON.parse(json) as ShowFileInput);
    storage.persist();
    modal.close();
    if (!badStage) bus.emit('message', { kind: 'toast', text: 'Show loaded' });
  } catch {
    bus.emit('message', { kind: 'toast', text: failure });
  }
}

/** Wires the import half of the dialog: "Load pasted show" and the file input. Call it after each `open`. */
export function wireShowImport(deps: ShowFileDeps): void {
  const pasted = byId('fTxt', HTMLTextAreaElement),
    file = byId('fFile', HTMLInputElement);
  byId('fImp').onclick = () => importShow(deps, pasted.value, 'Invalid JSON');
  file.onchange = () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    void chosen.text().then((text) => importShow(deps, text, 'Invalid file'));
  };
}
