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
 */
export function mountBuilder(host: HTMLElement, session: EditorSession, deps: BuilderDeps): () => void {
  const report = (text: string): void => deps.bus.emit('message', { kind: 'toast', text });
  const shell = mountShell(host, deps);
  const badge = new CountBadge(requireChild(host, '.count-badge'), session);
  let toolbar: EditToolbar | null = null;
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
  const disposers = [
    () => toolbar?.dispose(),
    () => badge.dispose(),
    listenBuilderKeys(deps.keys, (action) => toolbar?.run(action)),
    deps.mountTools(shell.slots, session, { ...deps.frames, report }),
    shell.dispose,
  ];
  return () => disposers.forEach((dispose) => dispose());
}

/** The parts under the start screen: laid out (so `#viewer` never gets a 0 px box) but out of reach until a choice. */
const COVERED = ['.builder-library', '.builder-centre', '.builder-inspector', '.inspector-drawer'];

/** Makes the covered parts `inert` (no focus, no click, out of the accessibility tree) or reachable again. */
function setCovered(host: HTMLElement, covered: boolean): void {
  for (const selector of COVERED) requireChild(host, selector).toggleAttribute('inert', covered);
}
