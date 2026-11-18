import type { EngineBus } from '../../engine/events';
import { byId } from '../dom';

/** How long a toast stays up; a newer toast replaces the text and restarts the time. */
const TOAST_MS = 1800;

/**
 * The pop-up note (`#toast`). It listens for engine `message` events of kind `toast`, so panels and io report through
 * the bus too and never need a reference to this class.
 */
export class Toast {
  readonly #element: HTMLElement;
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(bus: EngineBus) {
    this.#element = byId('toast');
    bus.on('message', (m) => {
      if (m.kind === 'toast') this.show(m.text);
    });
  }

  /** Shows `text` now and hides it after {@link TOAST_MS}, counted from the latest call. */
  show(text: string): void {
    this.#element.textContent = text;
    this.#element.style.display = 'block';
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => (this.#element.style.display = 'none'), TOAST_MS);
  }
}
