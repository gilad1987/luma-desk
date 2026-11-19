import { requireChild } from '../dom';
import { createElement } from '../shared';
import type { BuilderDeps } from './BuilderDeps';
import { builderMarkup } from './builderMarkup';
import { EditorSession } from './EditorSession';
import { mountBuilder } from './mountBuilder';

/** The DOM and the session of the builder while it is open. */
interface OpenBuilder {
  readonly host: HTMLElement;
  readonly session: EditorSession;
  readonly unmount: () => void;
  /** Puts the 3D viewer back on the desk; it must run before the host (and the pane holding the viewer) is removed. */
  readonly detachViewer: () => void;
}

/** The host's classes: `builder` for styles/builder/, `wa-dark` for the dark Web Awesome tokens, scoped to it. */
const HOST_CLASS = 'builder wa-dark';
/** The body class that hides the console (styles/builder/); `builder` would lay out `<body>` as the builder grid. */
const BODY_CLASS = 'is-building';

/**
 * The full-screen Builder mode behind "Build Stage": the builder screen over the desk, with the 3D view moved into it;
 * Done keeps the draft, Cancel drops it. The host is made on enter and removed on exit, so nothing stays behind.
 */
export class BuilderMode {
  readonly #deps: BuilderDeps;
  #open: OpenBuilder | null = null;

  constructor(deps: BuilderDeps) {
    this.#deps = deps;
  }

  get isOpen(): boolean {
    return this.#open !== null;
  }

  /**
   * Opens the builder on the current stage; a second call while open does nothing. The viewer moves into the 3D pane
   * before the fit, so the renderer sizes it in its new place; the fit runs before the console height 0, which it would
   * undo. A mount step that throws takes back what ran before it and rethrows: no half-built screen without Cancel.
   */
  enter(): void {
    if (this.#open) return;
    const session = new EditorSession(this.#deps);
    const host = createElement('section', HOST_CLASS, builderMarkup);
    document.body.appendChild(host);
    document.body.classList.add(BODY_CLASS);
    let unmount: (() => void) | null = null;
    try {
      requireChild(host, '[data-builder="done"]').onclick = () => this.exit(true);
      requireChild(host, '[data-builder="cancel"]').onclick = () => this.exit(false);
      unmount = mountBuilder(host, session, this.#deps);
      this.#open = { host, session, unmount, detachViewer: this.#deps.attachViewer(requireChild(host, '.builder-3d')) };
    } catch (error) {
      unmount?.();
      host.remove();
      document.body.classList.remove(BODY_CLASS);
      throw error;
    }
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
