import type { CommandRunner } from '../../command/CommandRunner';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { AppState } from '../../engine/AppState';
import type { EngineBus } from '../../engine/events';
import type { Executor } from '../../engine/Executor';
import type { ExecutorPool } from '../../engine/ExecutorPool';
import type { Programmer } from '../../engine/Programmer';
import type { Selection } from '../../engine/Selection';
import { SequencePanel } from '../../ui/panels/sequence/SequencePanel';
import type { SheetFixture } from '../../ui/panels/sheet/SheetFixture';
import { SheetPanel } from '../../ui/panels/sheet/SheetPanel';
import type { SideTabs } from '../../ui/panels/side/SideTabs';
import type { SideTab } from '../../ui/panels/side/sideTabsMarkup';
import type { UiServices } from './createUiServices';

/** What the Sequence and Fixture Sheet panes need; the field names are the main.ts variables they replace. */
export interface CuePanesDeps extends UiServices {
  /** `#side`: both panes render at its end, after the Auto Show pane. */
  readonly side: HTMLElement;
  readonly bus: EngineBus;
  readonly appState: AppState;
  readonly execs: readonly Executor[];
  readonly pool: Pick<ExecutorPool, 'go'>;
  readonly programmer: Programmer;
  readonly selection: Selection;
  readonly runner: Pick<CommandRunner, 'run'>;
  readonly sideTabs: Pick<SideTabs, 'current'>;
  readonly fixtures: readonly SheetFixture[];
  /** The current stage design; the sheet reads its DMX patch and GDTF modes on each repaint. */
  readonly stageDesign: () => StageDesign;
}

/** The two polled panes: each repaints on the slow tick only while its tab shows. */
export interface CuePanes {
  readonly sequence: SequencePanel;
  readonly sheet: SheetPanel;
}

/**
 * Renders the Sequence pane, then the Fixture Sheet pane, at the end of `#side`. Call it after the Auto Show panel
 * and before `wireCommandLine`. Register `sequence.slow` then `sheet.slow` on the slow tick, the original order.
 */
export function wireCuePanes(deps: CuePanesDeps): CuePanes {
  const sideTab = (): SideTab => deps.sideTabs.current;
  const sequence = new SequencePanel(deps.side, {
    bus: deps.bus,
    state: deps.appState,
    execs: deps.execs,
    pool: deps.pool,
    programmer: deps.programmer,
    store: deps.store,
    modal: deps.modal,
    runCommand: (raw) => deps.runner.run(raw),
    sideTab,
  });
  const sheet = new SheetPanel(deps.side, {
    fixtures: deps.fixtures,
    programmer: deps.programmer,
    selection: deps.selection,
    sideTab,
    stageDesign: deps.stageDesign,
  });
  return { sequence, sheet };
}
