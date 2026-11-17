import { EventBus } from '../../../../src/core';
import { buildRig } from '../../../../src/domain/rig';
import { AppState } from '../../../../src/engine/AppState';
import { defaultPresets } from '../../../../src/engine/defaultPresets';
import type { EngineBus, EngineEvents } from '../../../../src/engine/events';
import { ExecutorPool } from '../../../../src/engine/ExecutorPool';
import { OutputMerger } from '../../../../src/engine/OutputMerger';
import { PresetLibrary } from '../../../../src/engine/PresetLibrary';
import { Programmer } from '../../../../src/engine/Programmer';
import { Selection } from '../../../../src/engine/Selection';
import type { ManualClock } from '../playback/engineWorld';
import { stepFades } from '../playback/oracle/legacyFades';
import { computeOutput } from '../playback/oracle/legacyOutput';
import { progEnv } from './oracle/progEnv';

/** Records the engine's events in the form the oracle records the original log/toast/uiDirty/persist calls. */
function recordLikeOracle(bus: EngineBus): string[] {
  const lines: string[] = [];
  bus.on('message', (m) => lines.push(m.kind === 'log' ? `${m.level}:${m.text}` : `toast:${m.text}`));
  bus.on('selectionChanged', () => lines.push('selectionChanged'));
  bus.on('stateDirty', () => lines.push('stateDirty'));
  bus.on('showChanged', () => lines.push('showChanged'));
  bus.on('poolsChanged', () => lines.push('poolsChanged'));
  bus.on('cueStored', (c) => lines.push(`cueStored:${c.exec}.${c.num}`));
  return lines;
}

/** The programmer wired the way main.ts will wire it, with the output merge reading it. */
function engineSide() {
  const rig = buildRig();
  const clock: ManualClock = {
    seconds: 0,
    nowMs() {
      return this.seconds * 1000;
    },
    nowSeconds() {
      return this.seconds;
    },
  };
  const bus = new EventBus<EngineEvents>();
  const messages = recordLikeOracle(bus);
  const state = new AppState(bus);
  const selection = new Selection(rig, bus);
  const presets = new PresetLibrary(bus);
  presets.replace(defaultPresets());
  const pool = new ExecutorPool(clock, bus);
  const programmer = new Programmer({ rig, selection, presets, pool, state, clock, bus });
  const tempo = { bpm: 120, beatOrigin: 0 };
  const merger = new OutputMerger({ rig, pool, programmer, master: state, selection, tempo });
  return { rig, clock, messages, state, selection, presets, pool, programmer, merger };
}

/** Both worlds on their own rigs, so each output merge writes its own `fixture.out`. */
export function programmerWorlds() {
  const engine = engineSide();
  const env = progEnv(buildRig().fixtures);
  /** Moves both clocks: the executor clock and `performance.now()` of the original are the same time here. */
  const setTime = (t: number): void => {
    engine.clock.seconds = t;
    env.now = t;
  };
  const frame = (t: number): void => {
    setTime(t);
    engine.pool.stepFades(t);
    engine.merger.compute(t, { pump: 1, hitUntil: 0 });
    stepFades(env, t);
    computeOutput(env, t);
  };
  return { engine, env, setTime, frame };
}

export type Worlds = ReturnType<typeof programmerWorlds>;
