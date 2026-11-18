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
}

/** The class of the host section; every `.builder` rule in styles/builder/_layout.scss styles it. */
const HOST_CLASS = 'builder';

/**
 * The body class that hides the console while the builder is open (styles/builder/_layout.scss). It must differ from
 * `HOST_CLASS`, or every rule for the host section would also lay out `<body>` as the builder grid.
 */
const BODY_CLASS = 'is-building';

/**
 * The full-screen Builder mode behind "Build Stage": it hides the console, gives its height to the 3D view and puts
 * the builder screen over it; Done keeps the draft, Cancel drops it. The host section is made on enter and removed on
 * exit, so a closed builder leaves no DOM and no listener behind.
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
   * Opens the builder on the current stage; a second call while open does nothing. The layout fit runs before the
   * console height is set to 0, because the fit sets that height itself and would undo the 0.
   */
  enter(): void {
    if (this.#open) return;
    const session = new EditorSession(this.#deps);
    const host = createElement('section', HOST_CLASS, builderMarkup);
    document.body.appendChild(host);
    document.body.classList.add(BODY_CLASS);
    requireChild(host, '[data-builder="done"]').onclick = () => this.exit(true);
    requireChild(host, '[data-builder="cancel"]').onclick = () => this.exit(false);
    this.#open = { host, session, unmount: mountBuilder(host, session, this.#deps) };
    this.#deps.fitLayout();
    this.#deps.setConsoleHeight(0);
  }

  /**
   * Closes the builder: `keep` commits the draft (Done), otherwise the start design comes back (Cancel). The DOM, the
   * body class and the layout come back in `finally`: a throwing `rigChanged` listener must not leave the console
   * hidden under a dead builder screen.
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
      open.host.remove();
      document.body.classList.remove(BODY_CLASS);
      this.#deps.fitLayout();
    }
  }
}
