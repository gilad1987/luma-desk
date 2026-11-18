import { CommandRunner, type CommandDeps } from '../../command/CommandRunner';
import { OutputMerger, type OutputSources } from '../../engine/OutputMerger';
import { Programmer } from '../../engine/Programmer';
import type { ProgrammerDeps } from '../../engine/programmerActions/ProgrammerDeps';
import { withLiveRig } from '../shared';
import type { EngineHandles } from './wireEngine';

/** The engine parts the programmer, the output merge and the command line drive: the handles built before them. */
export type ProgrammerWiringDeps = Pick<
  EngineHandles,
  'stage' | 'bus' | 'clock' | 'appState' | 'selection' | 'tempo' | 'groupLibrary' | 'presetLibrary' | 'pool'
>;

/** The three engine parts that read the rig on every call. */
export interface ProgrammerHandles {
  readonly programmer: Programmer;
  readonly merger: OutputMerger;
  readonly runner: CommandRunner;
}

/**
 * Builds the programmer, the output merge and the command runner. Each one reads `deps.rig` on every call, so each
 * gets a live `rig` getter on the stage: after a stage change they work on the new rig with no event of their own.
 */
export function wireProgrammer(deps: ProgrammerWiringDeps): ProgrammerHandles {
  const { stage, bus, clock, appState, selection, tempo, pool } = deps;
  const presets = deps.presetLibrary;
  const programmer = new Programmer(
    withLiveRig(stage, { selection, presets, pool, state: appState, clock, bus } satisfies Omit<ProgrammerDeps, 'rig'>),
  );
  const merger = new OutputMerger(
    withLiveRig(stage, { pool, programmer, master: appState, selection, tempo } satisfies Omit<OutputSources, 'rig'>),
  );
  const runner = new CommandRunner(
    withLiveRig(stage, {
      selection,
      programmer,
      pool,
      state: appState,
      groups: deps.groupLibrary,
      presets,
      bus,
    } satisfies Omit<CommandDeps, 'rig'>),
  );
  return { programmer, merger, runner };
}
