import { he } from '../../../i18n/he';
import { byId, requireChild } from '../../dom';
import { importPickedFile } from './importPickedFile';
import type { MvrActions } from './MvrActions';
import { mvrPickMarkup } from './mvrPickMarkup';

/** The prompt body; the file name comes from the show, so `show` writes the message as text, not markup. */
const PROMPT_MARKUP = `<span class="mvrMissingText" dir="auto"></span>
${mvrPickMarkup('Import', 'mvrMissingFile')}
<button id="mvrMissingClose">✕</button>`;

/**
 * The page-level line (`#mvrMissingPrompt`, a slot of the app shell) that asks for the `.mvr` file of the saved stage
 * when this browser does not hold it. It is not a toast: it stays until an import succeeds or the user closes it.
 * It lives outside the Show File dialog because the shared modal shows one dialog at a time: a closed dialog, or
 * one that another dialog replaced, would hide the prompt until the user opens Show File again.
 */
export class MvrMissingPrompt {
  readonly #element: HTMLElement;
  readonly #mvr: Pick<MvrActions, 'importFile'>;

  /** Looks up the shell slot, so construct it after the composition root inserted the app shell. */
  constructor(mvr: Pick<MvrActions, 'importFile'>) {
    this.#element = byId('mvrMissingPrompt');
    this.#mvr = mvr;
  }

  /** Names `fileName` and offers an Import file input. */
  show(fileName: string): void {
    this.#element.innerHTML = PROMPT_MARKUP;
    requireChild(this.#element, '.mvrMissingText').textContent = he.mvr.missing(fileName);
    const input = byId('mvrMissingFile', HTMLInputElement);
    input.onchange = () => importPickedFile(input, this.#mvr);
    byId('mvrMissingClose').onclick = () => this.hide();
    this.#element.hidden = false;
  }

  /** Hides the prompt and drops its body. */
  hide(): void {
    this.#element.hidden = true;
    this.#element.innerHTML = '';
  }
}
