import { requireChild } from '../dom';
import { createElement } from '../shared';
import type { BuilderDeps } from './BuilderDeps';
import { builderMarkup } from './builderMarkup';
import { EditorSession } from './EditorSession';
import { mountBuilder } from './mountBuilder';

/** The DOM and the session of the builder while it is open. */
export interface OpenBuilder {
  readonly host: HTMLElement;
  readonly session: EditorSession;
  readonly unmount: () => void;
  /** Puts the 3D viewer back on the desk; it must run before the host (and the pane holding the viewer) is removed. */
  readonly detachViewer: () => void;
}

/**
 * The classes of the host section: `builder` for every builder rule in styles/builder/, `wa-dark` for the dark Web
 * Awesome tokens, which the theme scopes to the element that carries the class.
 */
const HOST_CLASS = 'builder wa-dark';

/**
 * The body class that hides the console while the builder is open (styles/builder/). It must differ from the host's
 * `builder` class, or every rule for the host section would also lay out `<body>` as the builder grid.
 */
export const BODY_CLASS = 'is-building';

/**
 * Puts the builder screen into the page and mounts it on a new session: the host section, the body class, Done and
 * Cancel (`close(true)` and `close(false)`), the parts (`mountBuilder`) and the 3D viewer in the 3D pane. Why one
 * guarded step: a mount step that throws takes back what ran before it and rethrows, so the user is never left under
 * a half-built screen without Cancel.
 */
export function openBuilderHost(deps: BuilderDeps, close: (keep: boolean) => void): OpenBuilder {
  const session = new EditorSession(deps);
  const host = createElement('section', HOST_CLASS, builderMarkup);
  document.body.appendChild(host);
  document.body.classList.add(BODY_CLASS);
  let unmount: (() => void) | null = null;
  try {
    requireChild(host, '[data-builder="done"]').onclick = () => close(true);
    requireChild(host, '[data-builder="cancel"]').onclick = () => close(false);
    unmount = mountBuilder(host, session, deps);
    const detachViewer = deps.attachViewer(requireChild(host, '.builder-3d'));
    return { host, session, unmount, detachViewer };
  } catch (error) {
    unmount?.();
    host.remove();
    document.body.classList.remove(BODY_CLASS);
    throw error;
  }
}
