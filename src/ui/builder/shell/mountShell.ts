import { requireChild } from '../../dom';
import type { BuilderDeps, BuilderSlots } from '../BuilderDeps';
import { describeWaButtons } from '../wa/waButton';
import { CentreSplit } from './CentreSplit';
import { InspectorHost } from './InspectorHost';
import { shellMarkup } from './shellMarkup';
import type { ViewMode } from './ViewModeSwitch';
import { ViewModeSwitch } from './ViewModeSwitch';

/** The shell of one builder visit: the slots the tools mount into and the disposer of its listeners. */
export interface MountedShell {
  readonly slots: BuilderSlots;
  readonly dispose: () => void;
}

/**
 * Appends the columns (`shellMarkup`) to `host`, after the bar and the start screen, gives the bar's and the drawer's
 * buttons their Hebrew help as a description, and joins the view-mode switch, the centre split and the inspector
 * host. The first mode is Plan on a narrow screen (a split of a small screen leaves two panes too small to use) and
 * Split otherwise. `host` must be in the page with Web Awesome registered, so
 * the split panel is upgraded when `CentreSplit` reads it.
 */
export function mountShell(host: HTMLElement, deps: Pick<BuilderDeps, 'narrow'>): MountedShell {
  host.insertAdjacentHTML('beforeend', shellMarkup);
  describeWaButtons(host);
  const initial: ViewMode = deps.narrow.matches ? 'plan' : 'split';
  const centre = new CentreSplit(requireChild(host, '.builder-centre'), initial);
  new ViewModeSwitch(requireChild(host, '.view-modes'), initial, (mode) => centre.setMode(mode));
  const inspector = new InspectorHost({
    column: requireChild(host, '.builder-inspector'),
    drawer: requireChild(host, '.inspector-drawer'),
    button: requireChild(host, '[data-builder="inspector"]'),
    narrow: deps.narrow,
  });
  return {
    slots: { tools: inspector.slot, view: requireChild(host, '.builder-plan') },
    dispose: () => {
      centre.dispose();
      inspector.dispose();
    },
  };
}
