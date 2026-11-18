import type { AimHeight } from '../../ui/components/AimHeight';
import { byId } from '../../ui/dom';
import type { CommandLine } from '../../ui/panels/command/CommandLine';
import type { EncodersPanel } from '../../ui/panels/encoders/EncodersPanel';
import type { ExecutorsPanel } from '../../ui/panels/executors/ExecutorsPanel';
import type { SelectionInfo } from '../../ui/panels/selection/SelectionInfo';
import type { PanelsWithServices } from './PanelsDeps';
import { wireCommandLine } from './wireCommandLine';
import { wireEncoders } from './wireEncoders';
import { wireExecutors } from './wireExecutors';

/** The panels below the viewer: command line, encoders, executors, and the selection chips over the viewer. */
export interface DeskPanels {
  readonly commandLine: CommandLine;
  readonly encoders: EncodersPanel;
  /** The Position pad's focus height, shared with the MA touch screen. */
  readonly aimHeight: AimHeight;
  readonly executors: ExecutorsPanel;
  readonly selectionInfo: SelectionInfo;
}

/**
 * Renders the command area at the start of `#desk`, the encoder section after `#main`, then the executor strip and
 * the master section at the end of `#desk`, in the original order. The FAN key reaches the encoders through a
 * closure because the command keys are built first.
 */
export function wireDeskPanels(deps: PanelsWithServices): DeskPanels {
  const { engine, services } = deps;
  const desk = byId('desk');
  const execs = engine.pool.execs;
  const commandLine = wireCommandLine({
    ...engine,
    ...services,
    desk,
    execs,
    fanToggled: () => encoders.fanToggled(),
    guideOrTourOpen: deps.guideOrTourOpen,
  });
  const { encoders, aimHeight } = wireEncoders({
    ...engine,
    main: byId('main'),
    modal: services.modal,
    layoutMode: deps.layoutMode,
    goboIcons: deps.render.gobo.icons,
  });
  const { executors, selectionInfo } = wireExecutors({
    ...engine,
    ...services,
    viewerTip: byId('tip'),
    desk,
    autoShow: deps.auto.autoShow,
  });
  return { commandLine, encoders, aimHeight, executors, selectionInfo };
}
