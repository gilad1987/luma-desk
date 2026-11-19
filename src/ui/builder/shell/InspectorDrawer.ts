import { requireChild } from '../../dom';
import { setWaInnerAria } from '../wa/waInnerAria';

/**
 * Opens and closes the narrow screen's inspector drawer (`.inspector-drawer-frame`, shellMarkup.ts). It is the
 * builder's own panel, not a `wa-drawer`: that one always opens as a modal dialog, which covers the bar and makes
 * Cancel and Done inert. The Inspector button toggles it and tells its state (`aria-expanded`, on the inner button too
 * through `setWaInnerAria`). Its `aria-controls` stays on the host only, since an IDREF cannot cross into the shadow
 * root; it is kept for the tests and for a future native button. The Close button and Escape close it. Opening moves
 * the focus into the drawer; closing moves it back to the button only if the focus was in the drawer.
 */
export class InspectorDrawer {
  readonly #frame: HTMLElement;
  readonly #button: HTMLElement;
  readonly #close: HTMLElement;
  /**
   * On `window`, so it runs after the document's listeners: an open `wa-tooltip` takes Escape in a `document` listener
   * that calls `stopPropagation()`, so that Escape never reaches `window` and one Escape closes the tooltip, not the
   * drawer too. The `window` choice does that work; `defaultPrevented` covers other handlers that take an Escape
   * without stopping it. An Escape from outside the drawer (the plan, the bar) leaves the drawer open and the focus
   * where it is.
   */
  readonly #onKey = (ev: KeyboardEvent): void => {
    if (ev.key !== 'Escape' || ev.defaultPrevented || !this.isOpen) return;
    if (this.#frame.contains(document.activeElement)) this.setOpen(false);
  };

  /** `body` is `.inspector-drawer`, the tools slot inside the frame; `button` is the bar's Inspector button. */
  constructor(body: HTMLElement, button: HTMLElement) {
    const frame = body.closest('.inspector-drawer-frame');
    if (!(frame instanceof HTMLElement)) throw new Error('.inspector-drawer is not inside .inspector-drawer-frame');
    this.#frame = frame;
    this.#button = button;
    this.#close = requireChild(frame, '[data-builder="inspector-close"]');
    button.setAttribute('aria-controls', frame.id);
    void setWaInnerAria(button, 'aria-expanded', 'false');
    button.onclick = () => this.setOpen(!this.isOpen);
    this.#close.onclick = () => this.setOpen(false);
    window.addEventListener('keydown', this.#onKey);
  }

  get isOpen(): boolean {
    return !this.#frame.hidden;
  }

  /** Whether the focus is in the drawer: on its frame, its Close button or the tools in it. */
  get hasFocus(): boolean {
    return this.#frame.contains(document.activeElement);
  }

  /**
   * Shows or hides the drawer. Opening moves the focus into it; closing gives it back to the Inspector button only if
   * it was in the drawer (a focus elsewhere stays) and `canFocusButton` holds: the caller passes `false` when the
   * button is about to be hidden (a wide screen), as a hidden button cannot take the focus.
   */
  setOpen(isOpen: boolean, canFocusButton = true): void {
    if (isOpen === this.isOpen) return;
    const hadFocus = this.#frame.contains(document.activeElement);
    this.#frame.hidden = !isOpen;
    void setWaInnerAria(this.#button, 'aria-expanded', String(isOpen));
    if (isOpen) this.#frame.focus();
    else if (hadFocus && canFocusButton) this.#button.focus();
  }

  /** Lets go of the buttons and of the window's Escape (U6). */
  dispose(): void {
    window.removeEventListener('keydown', this.#onKey);
    this.#button.onclick = null;
    this.#close.onclick = null;
  }
}
