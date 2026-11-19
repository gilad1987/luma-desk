import { InspectorDrawer } from './InspectorDrawer';

/**
 * The narrow-screen query as the builder needs it: whether it matches now and its `change` event. The app passes
 * `matchMedia(...)`; a test passes a fake it can flip.
 */
export type NarrowScreen = Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>;

/** The elements and the query `InspectorHost` works with. */
export interface InspectorParts {
  /** `.builder-inspector`, the third column on a wide screen. */
  readonly column: HTMLElement;
  /** `.inspector-drawer`, the body of the drawer (`InspectorDrawer`) the inspector lives in on a narrow screen. */
  readonly drawer: HTMLElement;
  /** `[data-builder="inspector"]`, the bar button that opens the drawer (shown only on a narrow screen). */
  readonly button: HTMLElement;
  readonly narrow: NarrowScreen;
}

/**
 * Decides where the tools panel lives: in the inspector column on a wide screen, in the drawer on a narrow one. When
 * the screen crosses the line it moves the panel's elements, not a copy, so the tools keep their state and their
 * listeners; leaving narrow closes the drawer, so it does not reopen empty. It does not build the panel (`mountTools`).
 */
export class InspectorHost {
  readonly #parts: InspectorParts;
  readonly #drawer: InspectorDrawer;
  readonly #onScreenChange = (): void => this.#follow();
  #isNarrow: boolean;

  constructor(parts: InspectorParts) {
    this.#parts = parts;
    this.#isNarrow = parts.narrow.matches;
    this.#drawer = new InspectorDrawer(parts.drawer, parts.button);
    parts.narrow.addEventListener('change', this.#onScreenChange);
  }

  /** Where the tools panel goes now: `BuilderSlots.tools` at mount time. */
  get slot(): HTMLElement {
    return this.#isNarrow ? this.#parts.drawer : this.#parts.column;
  }

  /** Stops following the screen width and lets go of the drawer's buttons and keys (U6). */
  dispose(): void {
    this.#parts.narrow.removeEventListener('change', this.#onScreenChange);
    this.#drawer.dispose();
  }

  #follow(): void {
    const from = this.slot;
    this.#isNarrow = this.#parts.narrow.matches;
    const to = this.slot;
    if (to === from) return;
    const wasInDrawer = this.#drawer.hasFocus;
    // a moved field loses its focus without a `change`, so a typed, uncommitted value would be lost; a blur commits it
    const active = document.activeElement;
    const field = active instanceof HTMLElement && from.contains(active) ? active : null;
    field?.blur();
    to.append(...Array.from(from.children));
    // a field moved into the drawer is not focused again: the drawer stays closed, and a hidden field cannot take it
    if (this.#isNarrow) return;
    // the Inspector button is hidden on a wide screen, so it cannot take the focus back
    this.#drawer.setOpen(false, false);
    // the field is the same element, now in the column, with its value committed; the frame and its Close button are
    // hidden now, so a focus on them goes to the column instead of falling to the body
    if (field) field.focus({ preventScroll: true });
    else if (wasInDrawer) this.#parts.column.focus({ preventScroll: true });
  }
}
