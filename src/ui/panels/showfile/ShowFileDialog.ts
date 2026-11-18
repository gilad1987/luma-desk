import { defaultGroups } from '../../../engine/defaultGroups';
import { he } from '../../../i18n/he';
import { byId } from '../../dom';
import { wireMvrButtons } from '../mvr/wireMvrButtons';
import type { ShowFileDeps } from './ShowFileDeps';
import { showFileMarkup } from './showFileMarkup';
import { wireShowImport } from './wireShowImport';

/**
 * The Show File dialog behind `#fileBtn`: download, copy, demo, new, import and the MVR row. Its markup is rebuilt on
 * every open, so the buttons are wired on every open too.
 */
export class ShowFileDialog {
  readonly #deps: ShowFileDeps;

  /** Wires `#fileBtn`, which the top bar renders, so construct it after `TopBar`. */
  constructor(deps: ShowFileDeps) {
    this.#deps = deps;
    byId('fileBtn').onclick = () => this.open();
  }

  /** Opens the dialog in the shared modal and wires its buttons. */
  open(): void {
    const { modal, bus, serializer, storage, demo, rig, loadShow, download, stamp } = this.#deps;
    const toast = (text: string): void => bus.emit('message', { kind: 'toast', text });
    modal.open(showFileMarkup);
    byId('fSave').onclick = () => {
      const json = JSON.stringify(serializer.serialize(), null, 1);
      download(`luma-show-${stamp()}.json`, json);
      toast(he.messages.show.downloaded);
    };
    byId('fCopy').onclick = () => void this.#copy(toast);
    byId('fDemo').onclick = () => {
      demo.load();
      modal.close();
      toast('Demo show loaded');
    };
    byId('fNew').onclick = () => {
      loadShow({ groups: defaultGroups(rig) });
      storage.persist();
      modal.close();
      toast('New show');
    };
    wireShowImport(this.#deps);
    wireMvrButtons(this.#deps.mvr);
  }

  /** Copies the compact show JSON; where the clipboard is refused, puts it in the import box, selected. */
  async #copy(toast: (text: string) => void): Promise<void> {
    const json = JSON.stringify(this.#deps.serializer.serialize());
    try {
      await navigator.clipboard.writeText(json);
      toast('Show copied to clipboard');
    } catch {
      const box = byId('fTxt', HTMLTextAreaElement);
      box.value = json;
      box.select();
      toast('Copy blocked — JSON shown in the box, copy it manually');
    }
  }
}
