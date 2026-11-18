import { CommandRunner } from '../../command/CommandRunner';
import { EventBus, performanceClock, type Clock } from '../../core';
import { buildRig, type Rig } from '../../domain/rig';
import { AppState } from '../../engine/AppState';
import type { EngineBus, EngineEvents } from '../../engine/events';
import { ExecutorPool } from '../../engine/ExecutorPool';
import { GroupLibrary } from '../../engine/GroupLibrary';
import { OutputMerger } from '../../engine/OutputMerger';
import { PresetLibrary } from '../../engine/PresetLibrary';
import { Programmer } from '../../engine/Programmer';
import { Selection } from '../../engine/Selection';
import { Tempo } from '../../engine/Tempo';

/**
 * The show engine every other area drives: one instance of each, shared by reference. Field names are the
 * module-level variables of the legacy main.ts, so the composition root maps them one to one.
 */
export interface EngineHandles {
  readonly rig: Rig;
  readonly bus: EngineBus;
  readonly clock: Clock;
  readonly appState: AppState;
  readonly selection: Selection;
  readonly tempo: Tempo;
  readonly groupLibrary: GroupLibrary;
  readonly presetLibrary: PresetLibrary;
  readonly pool: ExecutorPool;
  readonly programmer: Programmer;
  readonly merger: OutputMerger;
  readonly runner: CommandRunner;
}

/**
 * Builds the rig and the engine in the legacy order. It creates no three.js object and draws no random number, so
 * it may run before the scene without moving any seeded uuid (decision 24).
 */
export function wireEngine(): EngineHandles {
  const rig = buildRig();
  const bus = new EventBus<EngineEvents>();
  const clock = performanceClock;
  const appState = new AppState(bus);
  const selection = new Selection(rig, bus);
  const tempo = new Tempo();
  const groupLibrary = new GroupLibrary(bus);
  const presetLibrary = new PresetLibrary(bus);
  const pool = new ExecutorPool(clock, bus);
  const programmer = new Programmer({ rig, selection, presets: presetLibrary, pool, state: appState, clock, bus });
  const merger = new OutputMerger({ rig, pool, programmer, master: appState, selection, tempo });
  const runner = new CommandRunner({
    rig,
    selection,
    programmer,
    pool,
    state: appState,
    groups: groupLibrary,
    presets: presetLibrary,
    bus,
  });
  return { rig, bus, clock, appState, selection, tempo, groupLibrary, presetLibrary, pool, programmer, merger, runner };
}
