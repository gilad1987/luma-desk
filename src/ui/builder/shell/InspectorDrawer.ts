import { requireChild } from '../../dom';

/**
 * Opens and closes the narrow screen's inspector drawer (`.inspector-drawer-frame`, shellMarkup.ts). It is the
 * builder's own panel, not a `wa-drawer`: that one always opens as a modal dialog, which covers the bar and makes
 * Cancel and Done inert. The Inspector button toggles it and tells its state (`aria-expanded`, `aria-controls`); the
 * Close button and Escape close it. Opening moves the focus into the drawer, closing moves it back to the button.
 */
export class InspectorDrawer {
  readonly #frame: HTMLElement;
  readonly #button: HTMLElement;
  readonly #close: HTMLElement;
  readonly #onKey = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape' && this.isOpen) this.setOpen(false);
  };

  /** `body` is `.inspector-drawer`, the tools slot inside the frame; `button` is the bar's Inspector button. */
  constructor(body: HTMLElement, button: HTMLElement) {
    const frame = body.closest('.inspector-drawer-frame');
    if (!(frame instanceof HTMLElement)) throw new Error('.inspector-drawer is not inside .inspector-drawer-frame');
    this.#frame = frame;
    this.#button = button;
    this.#close = requireChild(frame, '[data-builder="inspector-close"]');
    button.setAttribute('aria-controls', frame.id);
    button.setAttribute('aria-expanded', 'false');
    button.onclick = () => this.setOpen(!this.isOpen);
    this.#close.onclick = () => this.setOpen(false);
    document.addEventListener('keydown', this.#onKey);
  }

  get isOpen(): boolean {
    return !this.#frame.hidden;
  }

  /** Shows or hides the drawer; a change of state moves the focus (into the drawer, or back to the button). */
  setOpen(isOpen: boolean): void {
    if (isOpen === this.isOpen) return;
    this.#frame.hidden = !isOpen;
    this.#button.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) this.#frame.focus();
    else this.#button.focus();
  }

  /** Lets go of the buttons and of the document's Escape (U6). */
  dispose(): void {
    document.removeEventListener('keydown', this.#onKey);
    this.#button.onclick = null;
    this.#close.onclick = null;
  }
}
