import type { AutoShowPanel } from '../../ui/panels/autoshow/AutoShowPanel';
import { byId } from '../../ui/dom';
import type { TopBar } from '../../ui/panels/top/TopBar';
import type { PanelsWithServices } from './PanelsDeps';
import { createShowLoaded } from './showLoaded';
import { wireCuePanes, type CuePanes } from './wireCuePanes';
import { wireSidePanes, type SidePanes } from './wireSidePanes';

/** The side column's panes and the repaint every show load runs. */
export type SideColumn = SidePanes &
  CuePanes & {
    readonly autoShowPanel: AutoShowPanel;
    /** The old `showLoaded`: the show file dialog and the boot restore call it after a load. */
    readonly showLoaded: () => void;
  };

/**
 * Renders `#side` in the original pane order: the tab bar, Pools, Auto Show, Sequence, then the Fixture Sheet. Each
 * pane appends to `#side` when it is built, so this order is the page order.
 */
export function wireSideColumn(deps: PanelsWithServices, topBar: Pick<TopBar, 'syncHaze'>): SideColumn {
  const { engine, files, services } = deps;
  const side = byId('side');
  const { sideTabs, pools } = wireSidePanes({
    ...engine,
    ...services,
    side,
    goboIcons: deps.render.gobo.icons,
    layoutMode: deps.layoutMode,
  });
  const showLoaded = createShowLoaded({ bus: engine.bus, topBar, pools });
  const autoShowPanel = deps.auto.mountPanel(side, {
    appState: engine.appState,
    showStorage: files.showStorage,
    sideTab: () => sideTabs.current,
  });
  const { sequence, sheet } = wireCuePanes({
    ...engine,
    ...services,
    side,
    execs: engine.pool.execs,
    sideTabs,
  });
  // a stage change can mark other presets unavailable (G10); a show load repaints the pools through `showLoaded`
  engine.bus.on('rigChanged', () => pools.render());
  return { sideTabs, pools, showLoaded, autoShowPanel, sequence, sheet };
}
