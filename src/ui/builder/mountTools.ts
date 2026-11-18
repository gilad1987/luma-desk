import { he } from '../../i18n/he';
import type { BuilderSlots } from './BuilderDeps';
import type { EditorSession } from './EditorSession';
import { FixtureTab } from './FixtureTab';
import { PropertyPanel } from './PropertyPanel';
import { StageTab } from './StageTab';
import { ToolTabs } from './ToolTabs';
import { TopView, type TopViewDeps } from './TopView';
import { TrussTab } from './TrussTab';

/**
 * Mounts the tool tabs and the property panel into `slots.tools` and the top view into `slots.view` (the
 * `BuilderDeps.mountTools` contract), and returns the one disposer that stops the session subscriptions, cancels a
 * pending top view frame and removes the DOM it added (U6). Every panel re-renders on each session change and edits
 * only through the session, so no panel reads or writes the stage itself.
 */
export function mountTools(slots: BuilderSlots, session: EditorSession, view: TopViewDeps): () => void {
  const stage = new StageTab(session);
  const trusses = new TrussTab(session);
  const fixtures = new FixtureTab(session);
  const props = new PropertyPanel(session);
  const { tools } = he.builder;
  const tabs = new ToolTabs([
    { label: 'Stage', title: tools.stageTab, panel: stage.root },
    { label: 'Trusses', title: tools.trussTab, panel: trusses.root },
    { label: 'Fixtures', title: tools.fixtureTab, panel: fixtures.root },
  ]);
  const root = document.createElement('div');
  root.className = 'builder-panel';
  root.appendChild(tabs.root);
  root.appendChild(props.root);
  slots.tools.appendChild(root);
  const topView = new TopView(slots.view, session, view);
  const panels = [stage, trusses, fixtures, props];
  const stop = session.onChange(() => panels.forEach((panel) => panel.render()));
  return () => {
    stop();
    topView.dispose();
    root.remove();
  };
}
