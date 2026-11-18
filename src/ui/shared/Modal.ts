import type { EngineBus } from '../../engine/events';
import { byId } from '../dom';
import { numberMarkup, renameMarkup } from './modalMarkup';

/** True when the click landed on the element with `id`; ids, not references, because dialog markup is rebuilt. */
const hitsId = (target: EventTarget | null, id: string): boolean => target instanceof Element && target.id === id;

/**
 * The one modal dialog (`#modal` backdrop, `#mbox` box) that rename, number entry, the show file and the guide all
 * fill. Construct it once at boot, where the original wired the backdrop and the document-level `#hClose` listener.
 */
export class Modal {
  readonly #backdrop: HTMLElement;
  readonly #box: HTMLElement;
  readonly #bus: EngineBus;

  constructor(bus: EngineBus) {
    this.#bus = bus;
    this.#backdrop = byId('modal');
    this.#box = byId('mbox');
    this.#backdrop.onclick = (ev) => {
      if (hitsId(ev.target, 'modal')) this.close();
    };
    // close buttons come and go with the dialog markup, so one document listener serves them all (quirk Q26, orig:2290)
    document.addEventListener('click', (ev) => {
      if (hitsId(ev.target, 'hClose')) this.close();
    });
  }

  /** Shows `html` in the box; `rtl` sets the right-to-left layout the Hebrew dialogs use. */
  open(html: string, rtl?: boolean): void {
    this.#box.className = 'mbox' + (rtl ? ' rtl' : '');
    this.#box.innerHTML = html;
    this.#backdrop.classList.add('show');
  }

  /** Hides the dialog; its markup stays until the next `open` replaces it. */
  close(): void {
    this.#backdrop.classList.remove('show');
  }

  /** The page keyboard handler reads this: while a dialog is open, only Escape (close) is handled. */
  isOpen(): boolean {
    return this.#backdrop.classList.contains('show');
  }

  /** Asks for a new name; a blank answer keeps `value` (quirk Q22, orig:2281). */
  rename(title: string, value: string, done: (name: string) => void): void {
    this.open(renameMarkup(title, value));
    const input = byId('mIn', HTMLInputElement);
    input.focus();
    input.select();
    this.#wire(input, () => done(input.value.trim() || value));
  }

  /**
   * Asks for a number; an entry that is not a number closes the dialog without calling `done` (quirk Q22, orig:2286).
   */
  number(title: string, done: (value: number) => void): void {
    this.open(numberMarkup(title));
    const input = byId('mIn', HTMLInputElement);
    input.focus();
    this.#wire(input, () => {
      const value = parseFloat(input.value);
      if (!isNaN(value)) done(value);
    });
  }

  /** OK (button or Enter) answers, closes and repaints everything; Cancel and Escape only close. */
  #wire(input: HTMLInputElement, answer: () => void): void {
    const ok = (): void => {
      answer();
      this.close();
      this.#bus.emit('stateDirty', undefined);
    };
    byId('mOk').onclick = ok;
    byId('mCancel').onclick = () => this.close();
    input.onkeydown = (e) => {
      if (e.key === 'Enter') ok();
      if (e.key === 'Escape') this.close();
    };
  }
}
