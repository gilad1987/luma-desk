import type { EngineBus } from '../../engine/events';
import type { GroupLibrary } from '../../engine/GroupLibrary';
import type { PresetLibrary } from '../../engine/PresetLibrary';
import type { Programmer } from '../../engine/Programmer';
import type { Selection } from '../../engine/Selection';
import type { LayoutMode } from '../../ui/panels/layoutMode';
import { PoolsPanel } from '../../ui/panels/pools/PoolsPanel';
import { SideTabs } from '../../ui/panels/side/SideTabs';
import type { UiServices } from './createUiServices';

/** What the tab bar and the pools pane need; the field names are the main.ts variables they replace. */
export interface SidePanesDeps extends UiServices {
  /** `#side`: the tab bar and then each pane render at its end. */
  readonly side: HTMLElement;
  readonly bus: EngineBus;
  readonly groupLibrary: GroupLibrary;
  readonly presetLibrary: PresetLibrary;
  readonly selection: Selection;
  readonly programmer: Programmer;
  /** Gobo wheel images by gobo index (`gobo.icons`), for the gobo preset slots. */
  readonly goboIcons: readonly string[];
  /** The active layout (the layout area's `deskMode`); MA never selects the Pools tab. */
  readonly layoutMode: () => LayoutMode;
}

/** The tab bar and the Pools pane, the first two children of `#side`. */
export interface SidePanes {
  readonly sideTabs: SideTabs;
  readonly pools: PoolsPanel;
}

/**
 * Renders the side tab bar, then the Pools pane after it. Call it after the show file dialog and before the Auto
 * Show panel, which renders the next pane. The pools paint only on `poolsChanged` or a show load, as before.
 */
export function wireSidePanes(deps: SidePanesDeps): SidePanes {
  const sideTabs = new SideTabs(deps.side, deps.bus, deps.layoutMode);
  const pools = new PoolsPanel(deps.side, {
    bus: deps.bus,
    groups: deps.groupLibrary,
    presets: deps.presetLibrary,
    selection: deps.selection,
    programmer: deps.programmer,
    store: deps.store,
    modal: deps.modal,
    goboIcons: deps.goboIcons,
  });
  return { sideTabs, pools };
}
