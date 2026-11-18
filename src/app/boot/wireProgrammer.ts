import { CommandRunner } from '../../command/CommandRunner';
import type { Clock } from '../../core';
import type { Rig } from '../../domain/rig';
import type { AppState } from '../../engine/AppState';
import type { EngineBus } from '../../engine/events';
import type { ExecutorPool } from '../../engine/ExecutorPool';
import type { GroupLibrary } from '../../engine/GroupLibrary';
import { OutputMerger } from '../../engine/OutputMerger';
import type { PresetLibrary } from '../../engine/PresetLibrary';
import { Programmer } from '../../engine/Programmer';
import type { Selection } from '../../engine/Selection';
import type { RigSource } from '../../engine/stage/RigSource';
import type { Tempo } from '../../engine/Tempo';

/** The engine parts the programmer, the output merge and the command line drive. */
export interface ProgrammerWiringDeps {
  readonly stage: RigSource;
  readonly bus: EngineBus;
  readonly clock: Clock;
  readonly appState: AppState;
  readonly selection: Selection;
  readonly tempo: Tempo;
  readonly groupLibrary: GroupLibrary;
  readonly presetLibrary: PresetLibrary;
  readonly pool: ExecutorPool;
}

/** The three engine parts that read the rig on every call. */
export interface ProgrammerHandles {
  readonly programmer: Programmer;
  readonly merger: OutputMerger;
  readonly runner: CommandRunner;
}

/**
 * Builds the programmer, the output merge and the command runner. Each one reads `deps.rig` on every call, so each
 * gets a `rig` getter on the stage: after a stage change they work on the new rig with no event of their own.
 */
export function wireProgrammer(deps: ProgrammerWiringDeps): ProgrammerHandles {
  const { stage, bus, clock, appState, selection, tempo, pool } = deps;
  const presets = deps.presetLibrary;
  const programmer = new Programmer({
    get rig(): Rig {
      return stage.rig;
    },
    selection,
    presets,
    pool,
    state: appState,
    clock,
    bus,
  });
  const merger = new OutputMerger({
    get rig(): Rig {
      return stage.rig;
    },
    pool,
    programmer,
    master: appState,
    selection,
    tempo,
  });
  const runner = new CommandRunner({
    get rig(): Rig {
      return stage.rig;
    },
    selection,
    programmer,
    pool,
    state: appState,
    groups: deps.groupLibrary,
    presets,
    bus,
  });
  return { programmer, merger, runner };
}
