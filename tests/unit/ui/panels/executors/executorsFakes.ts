import { vi } from 'vitest';
import { STYLES } from '../../../../../src/autoshow/styles';
import type { Section } from '../../../../../src/autoshow/sections';
import { EventBus, type Clock } from '../../../../../src/core';
import { AppState } from '../../../../../src/engine/AppState';
import type { EngineEvents } from '../../../../../src/engine/events';
import { Executor } from '../../../../../src/engine/Executor';
import type { ExecutorPool } from '../../../../../src/engine/ExecutorPool';
import type { Programmer } from '../../../../../src/engine/Programmer';
import { Tempo } from '../../../../../src/engine/Tempo';
import { StoreModeGuard, type Modal } from '../../../../../src/ui/shared';
import type { ExecutorsDeps } from '../../../../../src/ui/panels/executors/ExecutorsDeps';
import { asReal } from '../../fakes/asReal';

/** A clock the test sets: `seconds` for fades and beats, a fixed `nowMs` for tap tempo. */
export class FakeClock implements Clock {
  seconds = 0;
  readonly nowMs = vi.fn(() => 5000);
  nowSeconds = (): number => this.seconds;
}

/** Real engine state, store guard and tempo; spies for the pool, the programmer and the rename dialog. */
export function executorsFakes() {
  const bus = new EventBus<EngineEvents>();
  const state = new AppState(bus);
  const clock = new FakeClock();
  const tempo = new Tempo();
  const execs = Array.from({ length: 4 }, () => new Executor(false, clock));
  const pool = { execs, go: vi.fn(), flashPress: vi.fn(), flashRelease: vi.fn(), setLevel: vi.fn() };
  const programmer = { storeCue: vi.fn() };
  const modal = { rename: vi.fn() };
  const autoShow = { on: false, style: STYLES.edm, section: '' as Section | '', barsPerLook: () => 4 };
  const deps: ExecutorsDeps = {
    bus,
    state,
    store: new StoreModeGuard(state),
    programmer: asReal<Programmer>(programmer),
    pool: asReal<ExecutorPool>(pool),
    tempo,
    clock,
    modal: asReal<Modal>(modal),
    autoShow,
  };
  return { deps, state, clock, tempo, execs, pool, programmer, modal, autoShow };
}
