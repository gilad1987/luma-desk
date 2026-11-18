import type { CommandRunner } from '../../command/CommandRunner';
import type { AppState } from '../../engine/AppState';
import type { EngineBus } from '../../engine/events';
import type { Executor } from '../../engine/Executor';
import type { ExecutorPool } from '../../engine/ExecutorPool';
import type { Programmer } from '../../engine/Programmer';
import type { Selection } from '../../engine/Selection';
import type { RigSource } from '../../engine/stage/RigSource';
import { showStoreMode } from '../../ui/components/showStoreMode';
import { CommandLine } from '../../ui/panels/command/CommandLine';
import type { UiServices } from './createUiServices';

/** What the command line, its eight keys and the page keyboard need; names follow the main.ts variables. */
export interface CommandLineWiringDeps extends UiServices {
  /** `#desk`: the command area renders at its start. */
  readonly desk: HTMLElement;
  readonly bus: EngineBus;
  readonly appState: AppState;
  readonly programmer: Pick<Programmer, 'clearPress'>;
  readonly selection: Pick<Selection, 'ids' | 'set' | 'reverse'>;
  readonly pool: Pick<ExecutorPool, 'go'>;
  readonly execs: readonly Executor[];
  readonly runner: Pick<CommandRunner, 'run'>;
  /** The stage: the light ids come from its current rig. */
  readonly stage: Pick<RigSource, 'rig'>;
  /** FAN key pressed: `() => encoders.fanToggled()`; the encoders are built after the command line. */
  readonly fanToggled: () => void;
  /** The guide (`#guide.show`) or the tour (`tIdx >= 0`) covers the page; from the io area. */
  readonly guideOrTourOpen: () => boolean;
}

/**
 * Renders the command area at the start of `#desk` and wires `#cmd`, its keys and the page keyboard, then shows store
 * mode on `#kStore` and the body (the `storing` class), which needs the keys in the DOM. Call it after `wireCuePanes`
 * and before the encoders. CLEAR emptying a half-typed command first (the old `#kClear` wrap) is part of the keys.
 */
export function wireCommandLine(deps: CommandLineWiringDeps): CommandLine {
  const commandLine = new CommandLine(deps.desk, {
    bus: deps.bus,
    state: deps.appState,
    store: deps.store,
    programmer: deps.programmer,
    selection: deps.selection,
    pool: deps.pool,
    execs: deps.execs,
    modal: deps.modal,
    runCommand: (raw) => deps.runner.run(raw),
    lightIds: () => deps.stage.rig.lightIds(),
    fanToggled: deps.fanToggled,
    guideOrTourOpen: deps.guideOrTourOpen,
  });
  showStoreMode(deps.bus);
  return commandLine;
}
