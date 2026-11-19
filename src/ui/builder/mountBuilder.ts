import { requireChild } from '../dom';
import type { BuilderDeps } from './BuilderDeps';
import { listenBuilderKeys } from './builderKeys';
import { CountBadge } from './CountBadge';
import type { EditorSession } from './EditorSession';
import { EditToolbar } from './EditToolbar';
import { mountShell } from './shell/mountShell';
import { StartScreen } from './StartScreen';

/**
 * Builds the parts of one builder visit into `host` (already in the page, holding `builderMarkup`) and returns the
 * one disposer that undoes every subscription they made (U6). The shell (columns, split, inspector) comes first, so
 * the tools have their slots. The start screen shows first; a choice becomes the draft's first undo step and
 * switches the host to `is-editing`, which shows the tools. The edit toolbar is made only then: on the start screen
 * there is no chosen draft yet, so no edit button exists and the keys reach nothing (Mirror there would edit the
 * stage the user is about to replace). The columns and the drawer under the start screen are `inert` until then.
 * A part that throws while mounting takes back the parts made before it, then the error goes on: the caller gets no
 * disposer in that case, so the document's and the screen query's listeners would stay behind.
 */
export function mountBuilder(host: HTMLElement, session: EditorSession, deps: BuilderDeps): () => void {
  const disposers: (() => void)[] = [];
  const disposeAll = (): void =>
    disposers
      .splice(0)
      .reverse()
      .forEach((dispose) => dispose());
  try {
    mountParts(host, session, deps, disposers);
  } catch (error) {
    disposeAll();
    throw error;
  }
  return disposeAll;
}

/** Mounts the parts in order and pushes the disposer of each one as soon as it exists, so a later throw can undo it. */
function mountParts(host: HTMLElement, session: EditorSession, deps: BuilderDeps, disposers: (() => void)[]): void {
  const report = (text: string): void => deps.bus.emit('message', { kind: 'toast', text });
  const shell = mountShell(host, deps);
  disposers.push(shell.dispose);
  const badge = new CountBadge(requireChild(host, '.count-badge'), session);
  disposers.push(() => badge.dispose());
  let toolbar: EditToolbar | null = null;
  disposers.push(() => toolbar?.dispose());
  const start = new StartScreen(requireChild(host, '.start-screen'), {
    builtIn: deps.stage.builtIn,
    choose: (design) => {
      session.edit(() => design);
      toolbar ??= new EditToolbar(requireChild(host, '.edit-tools'), session, report);
      host.classList.add('is-editing');
      setCovered(host, false);
    },
  });
  setCovered(host, true);
  start.show();
  disposers.push(listenBuilderKeys(deps.keys, (action) => toolbar?.run(action)));
  disposers.push(deps.mountTools(shell.slots, session, { ...deps.frames, report }));
}

/** The parts under the start screen: laid out (so `#viewer` never gets a 0 px box) but out of reach until a choice. */
const COVERED = ['.builder-library', '.builder-centre', '.builder-inspector', '.inspector-drawer'];

/** Makes the covered parts `inert` (no focus, no click, out of the accessibility tree) or reachable again. */
function setCovered(host: HTMLElement, covered: boolean): void {
  for (const selector of COVERED) requireChild(host, selector).toggleAttribute('inert', covered);
}
