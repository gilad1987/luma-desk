import { byId } from '../../ui/dom';

/** What one command line wrote: the new feedback lines as [css class, text] and the toast text (null if none). */
export interface CapturedOutput {
  readonly line: string;
  readonly log: [cls: string, text: string | null][];
  readonly toast: string | null;
}

/**
 * Records what a command line writes to `#cmdFb` and `#toast`. The observers start when this is built and every
 * capture drops the records from before it, so only the output of that one line counts.
 */
export class CommandCapture {
  readonly #feedback = new MutationObserver(() => {});
  readonly #toasts = new MutationObserver(() => {});
  readonly #toast = byId('toast');

  constructor() {
    this.#feedback.observe(byId('cmdFb'), { childList: true });
    this.#toasts.observe(this.#toast, { childList: true, characterData: true, subtree: true });
  }

  /** Runs `run(line)` and returns what it wrote; the feedback span's class says ok, error or plain. */
  capture(line: string, run: (line: string) => void): CapturedOutput {
    this.#feedback.takeRecords();
    this.#toasts.takeRecords();
    run(line);
    const added = this.#feedback.takeRecords().flatMap((m) => Array.from(m.addedNodes));
    const toast = this.#toasts.takeRecords().length ? this.#toast.textContent : null;
    const log = added.map((n): [string, string | null] => [
      n.firstChild instanceof Element ? n.firstChild.className : '',
      n.textContent,
    ]);
    return { line, log, toast };
  }
}
