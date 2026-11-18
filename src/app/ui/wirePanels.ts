import { byId } from '../../ui/dom';
import type { TopBar } from '../../ui/panels/top/TopBar';
import { wireShowFileDialog } from '../uix/wireShowFileDialog';
import { createUiServices, type UiServices } from './createUiServices';
import type { PanelsDeps } from './PanelsDeps';
import { wireDeskPanels, type DeskPanels } from './wireDeskPanels';
import { wireSideColumn, type SideColumn } from './wireSideColumn';
import { wireTopBar } from './wireTopBar';

/** Every DOM panel the layout, the frame loop and the boot restore use. */
export type Panels = SideColumn &
  DeskPanels &
  UiServices & {
    readonly topBar: TopBar;
  };

/**
 * Builds the DOM panels in the original page order and the same order for each kind of listener (listeners for
 * different events do not depend on each other's order): top bar, dialog and toast services, the Show File dialog,
 * the side column, then the desk panels. The dialog wires `#fileBtn` before the pools it repaints exist, so
 * it reaches the repaint through a closure; no show can load before boot ends.
 */
export function wirePanels(deps: PanelsDeps): Panels {
  const { engine, render, files } = deps;
  const topBar = wireTopBar({ ...render, app: byId('app'), appState: engine.appState });
  const services = createUiServices(engine.bus, engine.appState);
  wireShowFileDialog({
    ...engine,
    ...files,
    modal: services.modal,
    showLoaded: () => side.showLoaded(),
    cancelBuilder: deps.builder.cancel,
  });
  const side = wireSideColumn({ ...deps, services }, topBar);
  return { topBar, ...services, ...side, ...wireDeskPanels({ ...deps, services }) };
}
