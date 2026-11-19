import { he } from '../../i18n/he';
import type { BuilderSlots } from './BuilderDeps';
import { Debounce, timerSchedule, type Schedule } from './Debounce';
import type { EditorSession } from './EditorSession';
import { FixtureTab } from './FixtureTab';
import { PropertyPanel } from './PropertyPanel';
import { StageTab } from './StageTab';
import { PlanView, type PlanViewDeps } from './plan/PlanView';
import { ToolTabs } from './ToolTabs';
import { TrussTab } from './TrussTab';

/**
 * Mounts the tool tabs and the property panel into `slots.tools` and the plan view into `slots.view` (the
 * `BuilderDeps.mountTools` contract), and returns the one disposer that stops the session subscriptions, cancels a
 * pending plan view frame and a pending panel render, and removes the DOM it added (U6). Every panel edits only
 * through the session, so no panel reads or writes the stage itself.
 *
 * The panels re-render once per burst of session changes, on the next task of `schedule` (a timer, not a microtask):
 * a field sends its value on `change`, which fires before Tab moves the focus, so a render inside it would remove the
 * field that gets the focus next. Later, the focus is already on that field and `renderKeepingFocus` keeps it there.
 */
export function mountTools(
  slots: BuilderSlots,
  session: EditorSession,
  view: PlanViewDeps,
  schedule: Schedule = timerSchedule,
): () => void {
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
  const planView = new PlanView(slots.view, session, view);
  const panels = [stage, trusses, fixtures, props];
  const render = new Debounce(schedule, 0);
  const stop = session.onChange(() => render.request(() => panels.forEach((panel) => panel.render())));
  return () => {
    stop();
    render.cancel();
    planView.dispose();
    root.remove();
  };
}
