import type { BuilderDeps } from './BuilderDeps';
import { OpenBooking } from './OpenBooking';
import { BODY_CLASS, openBuilderHost, type OpenBuilder } from './openBuilderHost';

/**
 * The full-screen Builder mode behind "Build Stage": it hides the console, puts the builder screen over the desk and
 * moves the 3D view into the builder's 3D pane; Done keeps the draft, Cancel drops it. The host section is made on
 * enter and removed on exit, so a closed builder leaves no DOM and no listener behind.
 */
export class BuilderMode {
  readonly #deps: BuilderDeps;
  readonly #booking = new OpenBooking();
  #open: OpenBuilder | null = null;

  constructor(deps: BuilderDeps) {
    this.#deps = deps;
  }

  get isOpen(): boolean {
    return this.#open !== null;
  }

  /**
   * Books an open for after the chunk load and returns the call that enters, if no later booking or `exit` came first
   * (`OpenBooking`).
   */
  book(): () => void {
    return this.#booking.book(() => this.enter());
  }

  /**
   * Opens the builder on the current stage; a second call while open does nothing. The viewer moves into the 3D pane
   * before the fit, so the renderer sizes it in its new place; the fit runs before the console height 0, which it would
   * undo. A mount step that throws takes back what ran before it and rethrows: no half-built screen without Cancel.
   */
  enter(): void {
    if (this.#open) return;
    this.#open = openBuilderHost(this.#deps, (keep) => this.exit(keep));
    this.#deps.fitLayout();
    this.#deps.setConsoleHeight(0);
    this.#deps.setDeskInert(true);
  }

  /**
   * Closes the builder: `keep` commits the draft (Done), otherwise the start design comes back (Cancel). The viewer,
   * the DOM, the body class, the live desk and the layout come back in `finally`: a throwing `rigChanged` listener
   * must not leave the console hidden, the 3D view gone or the desk inert under a dead builder screen.
   */
  exit(keep: boolean): void {
    this.#booking.cancel();
    const open = this.#open;
    if (!open) return;
    this.#open = null;
    try {
      open.unmount();
      if (keep) open.session.commit();
      else open.session.cancel();
    } finally {
      open.detachViewer();
      open.host.remove();
      document.body.classList.remove(BODY_CLASS);
      this.#deps.setDeskInert(false);
      this.#deps.fitLayout();
    }
  }
}
