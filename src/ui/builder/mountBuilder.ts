import { requireChild } from '../dom';
import type { BuilderDeps } from './BuilderDeps';
import { listenBuilderKeys } from './builderKeys';
import { CountBadge } from './CountBadge';
import type { EditorSession } from './EditorSession';
import { EditToolbar } from './EditToolbar';
import { StartScreen } from './StartScreen';

/**
 * Builds the parts of one builder visit into `host` (already holding `builderMarkup`) and returns the one disposer
 * that undoes every subscription they made (U6). The start screen shows first; a choice becomes the draft's first
 * undo step and switches the host to `is-editing`, which shows the tools. The edit toolbar is made only then: on the
 * start screen there is no chosen draft yet, so no edit button exists and the keys reach nothing (Mirror there would
 * edit the stage the user is about to replace).
 */
export function mountBuilder(host: HTMLElement, session: EditorSession, deps: BuilderDeps): () => void {
  const report = (text: string): void => deps.bus.emit('message', { kind: 'toast', text });
  const badge = new CountBadge(requireChild(host, '.count-badge'), session);
  let toolbar: EditToolbar | null = null;
  const start = new StartScreen(requireChild(host, '.start-screen'), {
    builtIn: deps.stage.builtIn,
    choose: (design) => {
      session.edit(() => design);
      toolbar ??= new EditToolbar(requireChild(host, '.edit-tools'), session, report);
      host.classList.add('is-editing');
    },
  });
  start.show();
  const slots = { tools: requireChild(host, '.builder-tools'), view: requireChild(host, '.builder-view') };
  const disposers = [
    () => toolbar?.dispose(),
    () => badge.dispose(),
    listenBuilderKeys(deps.keys, (action) => toolbar?.run(action)),
    deps.mountTools(slots, session),
  ];
  return () => disposers.forEach((dispose) => dispose());
}
