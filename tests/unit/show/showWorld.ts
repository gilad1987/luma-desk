import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EventBus, type Clock } from '../../../src/core';
import { buildRig } from '../../../src/domain/rig';
import { AppState } from '../../../src/engine/AppState';
import type { EngineEvents } from '../../../src/engine/events';
import { ExecutorPool } from '../../../src/engine/ExecutorPool';
import { GroupLibrary } from '../../../src/engine/GroupLibrary';
import { PresetLibrary } from '../../../src/engine/PresetLibrary';
import { Programmer } from '../../../src/engine/Programmer';
import { Selection } from '../../../src/engine/Selection';
import { Tempo } from '../../../src/engine/Tempo';
import { DemoShow, ShowSerializer, ShowStorage } from '../../../src/show';
import { MemoryStore } from '../../shared';

/** A frozen executor clock; the show layer never reads time, playback only stamps it. */
const clock: Clock = { nowMs: () => 0, nowSeconds: () => 0 };

/** Reads a show saved by an older app, as raw localStorage text. */
export const readSavedShow = (file: string): string =>
  readFileSync(join(import.meta.dirname, '..', '..', 'fixtures', file), 'utf8');

/** The engine and the show layer wired the way main.ts wires them, over an in-memory store. */
export function showWorld() {
  const rig = buildRig();
  const bus = new EventBus<EngineEvents>();
  const events: string[] = [];
  for (const name of ['showChanged', 'poolsChanged', 'selectionChanged', 'stateDirty'] as const)
    bus.on(name, () => events.push(name));
  const state = new AppState(bus);
  const selection = new Selection(rig, bus);
  const tempo = new Tempo();
  const groups = new GroupLibrary(bus);
  const presets = new PresetLibrary(bus);
  const pool = new ExecutorPool(clock, bus);
  const programmer = new Programmer({ rig, selection, presets, pool, state, clock, bus, source: { cause: 'boot' } });
  const { execs } = pool;
  const serializer = new ShowSerializer({ rig, groups, presets, execs, tempo, state, programmer, selection });
  const demo = new DemoShow({ rig, serializer, execs, state, bus });
  const store = new MemoryStore();
  const storage = new ShowStorage(store, () => serializer.serialize());
  bus.on('showChanged', () => storage.persist());
  const json = (): string => JSON.stringify(serializer.serialize());
  return {
    rig,
    bus,
    events,
    state,
    tempo,
    groups,
    presets,
    programmer,
    selection,
    execs,
    serializer,
    demo,
    store,
    storage,
    json,
  };
}
