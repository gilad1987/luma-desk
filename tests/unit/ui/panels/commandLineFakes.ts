import { vi } from 'vitest';
import { EventBus } from '../../../../src/core';
import { AppState } from '../../../../src/engine/AppState';
import type { EngineEvents } from '../../../../src/engine/events';
import { Executor } from '../../../../src/engine/Executor';
import type { ExecutorPool } from '../../../../src/engine/ExecutorPool';
import type { CommandLineDeps } from '../../../../src/ui/panels/command/CommandLineDeps';
import { Modal, StoreModeGuard } from '../../../../src/ui/shared';

/** Real bus, state, store guard, modal and one executor; spies for the pool's GO and the programmer and selection. */
export function commandLineDeps() {
  const bus = new EventBus<EngineEvents>();
  const state = new AppState(bus);
  const go = vi.fn<ExecutorPool['go']>();
  /** Set `building` to stand for an open Stage Builder. */
  const flags = { building: false };
  const deps: CommandLineDeps = {
    bus,
    state,
    store: new StoreModeGuard(state),
    modal: new Modal(bus),
    programmer: { clearPress: vi.fn() },
    selection: { ids: [], set: vi.fn(), reverse: vi.fn() },
    runCommand: vi.fn(),
    execs: [new Executor(false, { nowMs: () => 0, nowSeconds: () => 0 })],
    pool: { go },
    lightIds: () => [],
    fanToggled: vi.fn(),
    guideOrTourOpen: () => false,
    builderOpen: () => flags.building,
  };
  return { deps, state, go, flags };
}
