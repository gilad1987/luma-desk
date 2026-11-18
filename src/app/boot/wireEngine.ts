import type { CommandRunner } from '../../command/CommandRunner';
import { EventBus, performanceClock, type Clock } from '../../core';
import { BUILT_IN_DESIGN } from '../../domain/stage/templates/sultansPool/builtInDesign';
import { AppState } from '../../engine/AppState';
import type { EngineBus, EngineEvents } from '../../engine/events';
import { ExecutorPool } from '../../engine/ExecutorPool';
import { GroupLibrary } from '../../engine/GroupLibrary';
import type { OutputMerger } from '../../engine/OutputMerger';
import { PresetLibrary } from '../../engine/PresetLibrary';
import type { Programmer } from '../../engine/Programmer';
import { Selection } from '../../engine/Selection';
import { MissingFixtureNotice } from '../../engine/stage/MissingFixtureNotice';
import { StageGroups } from '../../engine/stage/StageGroups';
import { StageService } from '../../engine/stage/StageService';
import { Tempo } from '../../engine/Tempo';
import { he } from '../../i18n/he';
import { savedStageOf } from '../../show/stageField';
import { readSavedShowText } from '../shared';
import { wireProgrammer } from './wireProgrammer';

/**
 * The show engine every other area drives: one instance of each, shared by reference. Field names are the
 * module-level variables of the legacy main.ts, so the composition root maps them one to one. There is no `rig`
 * field: the stage replaces the rig at runtime, so every reader asks `stage.rig` when it needs it.
 */
export interface EngineHandles {
  readonly stage: StageService;
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
 * The stage service on the stage saved with the show, else the built-in one, so the first rig is already the saved
 * one and nothing is built twice. `builtIn` is the `BUILT_IN_DESIGN` object itself: `isBuiltIn` compares by identity.
 */
function createStage(bus: EngineBus): StageService {
  return new StageService(bus, {
    builtIn: BUILT_IN_DESIGN,
    initial: savedStageOf(readSavedShowText()),
    tooManyFixtures: he.builder.tooManyFixtures,
  });
}

/**
 * Builds the stage and the engine in the legacy order. It creates no three.js object and draws no random number, so
 * it may run before the scene without moving any seeded uuid (decision 24). The bus is synchronous, so construction
 * order is the `rigChanged` delivery order (plan §3.2): selection prune, group pool, notice reset.
 */
export function wireEngine(): EngineHandles {
  const bus = new EventBus<EngineEvents>();
  const stage = createStage(bus);
  const clock = performanceClock;
  const appState = new AppState(bus);
  const selection = new Selection(stage.rig, bus, stage);
  const tempo = new Tempo();
  const groupLibrary = new GroupLibrary(bus);
  new StageGroups(bus, stage, groupLibrary);
  const presetLibrary = new PresetLibrary(bus, stage);
  const pool = new ExecutorPool(clock, bus);
  const notice = new MissingFixtureNotice(bus, stage);
  pool.observeCues((execIndex, cue) => notice.check(execIndex, cue));
  const core = { stage, bus, clock, appState, selection, tempo, groupLibrary, presetLibrary, pool };
  return { ...core, ...wireProgrammer(core) };
}
