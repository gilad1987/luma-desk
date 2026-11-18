import { EventBus, type Clock } from '../../src/core';
import { buildRig } from '../../src/domain/rig';
import { AppState } from '../../src/engine/AppState';
import type { EngineEvents } from '../../src/engine/events';
import { ExecutorPool } from '../../src/engine/ExecutorPool';
import { GroupLibrary } from '../../src/engine/GroupLibrary';
import { PresetLibrary } from '../../src/engine/PresetLibrary';
import { Programmer } from '../../src/engine/Programmer';
import { Selection } from '../../src/engine/Selection';
import { Tempo } from '../../src/engine/Tempo';

/** A clock held at zero, so nothing in the engine moves on its own. */
export const stillClock: Clock = { nowMs: () => 0, nowSeconds: () => 0 };

/** A real engine built as the composition root builds it, under the root's variable names. */
export function engineParts() {
  const rig = buildRig(),
    bus = new EventBus<EngineEvents>(),
    appState = new AppState(bus),
    selection = new Selection(rig, bus),
    tempo = new Tempo(),
    groupLibrary = new GroupLibrary(bus),
    presetLibrary = new PresetLibrary(bus),
    pool = new ExecutorPool(stillClock, bus);
  const programmer = new Programmer({
    rig,
    selection,
    presets: presetLibrary,
    pool,
    state: appState,
    clock: stillClock,
    bus,
  });
  return { rig, bus, appState, selection, tempo, groupLibrary, presetLibrary, pool, programmer };
}
