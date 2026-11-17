import { EventBus, type Clock } from '../../../../src/core';
import { buildRig } from '../../../../src/domain/rig';
import type { FixtureValues } from '../../../../src/engine/CueList';
import type { EngineEvents } from '../../../../src/engine/events';
import { ExecutorPool } from '../../../../src/engine/ExecutorPool';
import { OutputMerger, type OutputModulation } from '../../../../src/engine/OutputMerger';
import type { FxIndex, PhaserInstance } from '../../../../src/engine/shared';

/** A settable executor clock: tests move it by hand, independently of the frame time (two time sources). */
export interface ManualClock extends Clock {
  seconds: number;
}

/** The refactored playback engine wired the way main.ts will wire it, with stand-ins for the state owners. */
export function engineWorld() {
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
  const messages: string[] = [];
  bus.on('message', (m) => messages.push(m.kind === 'log' ? `${m.level}:${m.text}` : `toast:${m.text}`));
  const pool = new ExecutorPool(clock, bus);
  const programmer = { vals: {} as FixtureValues, fxList: [] as PhaserInstance[], fx: {} as FxIndex };
  const master = { gm: 1, blackout: false, highlight: false };
  const selected = new Set<number>();
  const tempo = { bpm: 120, beatOrigin: 0 };
  const modulation: { pump: number; hitUntil: number } = { pump: 1, hitUntil: 0 };
  const selection = { has: (id: number) => selected.has(id) };
  const merger = new OutputMerger({ rig, pool, programmer, master, selection, tempo });
  const frame = (t: number, mod: OutputModulation = modulation): void => {
    pool.stepFades(t);
    merger.compute(t, mod);
  };
  return { rig, clock, messages, pool, programmer, master, selected, tempo, modulation, frame };
}

export type EngineWorld = ReturnType<typeof engineWorld>;
