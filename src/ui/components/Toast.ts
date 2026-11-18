import type { EngineBus, ToastAction } from '../../engine/events';
import { byId } from '../dom';
import { createElement } from '../shared';

/** How long a toast stays up; a newer toast replaces the text and restarts the time. */
const TOAST_MS = 1800;
/** A toast with a button stays longer, so the user has time to reach the button. */
const ACTION_MS = 8000;

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
   * Shows `text` now and hides it after {@link TOAST_MS}, counted from the latest call. `action` adds one button after
   * the text; a click runs it and hides the toast.
   */
  show(text: string, action?: ToastAction): void {
    this.#element.textContent = text;
    if (action) this.#element.appendChild(this.#button(action));
    this.#element.style.display = 'block';
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#hide(), action ? ACTION_MS : TOAST_MS);
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
