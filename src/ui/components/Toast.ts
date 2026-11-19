import type { EngineBus, ToastAction } from '../../engine/events';
import { byId } from '../dom';
import { createElement } from '../shared';

/** How long a short toast stays up; a newer toast replaces the text and restarts the time. */
const TOAST_MS = 1800;
/** A toast with a button stays longer, so the user has time to reach the button. */
const ACTION_MS = 8000;
/** A long toast stays this long per character (20 characters a second), so the user can read all of it. */
const PER_CHAR_MS = 50;
/**
 * The most a toast stays up: the longest one the desk joins (an import while a dialog is open, about 270 characters)
 * still gets its full reading time, and a longer text (a long file name) does not hold the screen for longer.
 */
const MAX_MS = 15000;

/** The time `text` stays up: the base time, longer for a long text, at most {@link MAX_MS}. */
const shownFor = (text: string, base: number): number => Math.min(MAX_MS, Math.max(base, PER_CHAR_MS * text.length));

/**
 * The pop-up note (`#toast`). It listens for engine `message` events of kind `toast`, so panels and io report through
 * the bus too and never need a reference to this class.
 */
export class Toast {
  readonly #element: HTMLElement;
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(bus: Pick<EngineBus, 'on'>) {
    this.#element = byId('toast');
    bus.on('message', (m) => {
      if (m.kind === 'toast') this.show(m.text, m.action);
    });
  }

  /**
   * Shows `text` now and hides it after {@link TOAST_MS}, or longer for a long text, counted from the latest call.
   * `action` adds one button after the text; a click runs it and hides the toast.
   */
  show(text: string, action?: ToastAction): void {
    this.#element.textContent = text;
    if (action) this.#element.appendChild(this.#button(action));
    this.#element.style.display = 'block';
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#hide(), shownFor(text, action ? ACTION_MS : TOAST_MS));
  }

  #hide(): void {
    this.#element.style.display = 'none';
  }

  #button(action: ToastAction): HTMLElement {
    const button = createElement('button', 'toast-action');
    button.type = 'button';
    button.textContent = action.label;
    button.style.marginInlineStart = '10px';
    // the toast may let clicks through to the desk under it; its button must take them
    button.style.pointerEvents = 'auto';
    button.onclick = () => {
      clearTimeout(this.#timer);
      this.#hide();
      action.run();
    };
    return button;
  }
}
