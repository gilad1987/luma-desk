import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../src/core';
import { AppState } from '../../../src/engine/AppState';
import type { EngineEvents } from '../../../src/engine/events';
import { showStoreMode } from '../../../src/ui/components/showStoreMode';
import { StoreModeGuard } from '../../../src/ui/shared';
import { FakeDom } from './fakes/installFakeDom';

const setup = () => {
  const bus = new EventBus<EngineEvents>();
  const state = new AppState(bus);
  return { bus, state, guard: new StoreModeGuard(state) };
};

describe('store mode', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('the guard reads and writes the engine flag, holding none of its own', () => {
    const { state, guard } = setup();
    guard.set(true);
    expect([state.storeMode, guard.active]).toEqual([true, true]);
    state.setStoreMode(false);
    expect(guard.active).toBe(false);
  });

  it('intercept stores and leaves store mode only while storing', () => {
    const { guard } = setup();
    const store = vi.fn<(storing: boolean) => void>();
    expect(guard.intercept(() => store(guard.active))).toBe(false);
    expect(store).not.toHaveBeenCalled();
    guard.set(true);
    expect(guard.intercept(() => store(guard.active))).toBe(true);
    expect(store).toHaveBeenCalledWith(true);
    expect(guard.active).toBe(false);
  });

  it('takeStoreCommand arms store mode for a bare `store` in any case and spacing only', () => {
    const { guard } = setup();
    expect(guard.takeStoreCommand('store 1')).toBe(false);
    expect(guard.active).toBe(false);
    expect(guard.takeStoreCommand('  StOrE ')).toBe(true);
    expect(guard.active).toBe(true);
  });

  it('showStoreMode lights #kStore and marks the body on each change', () => {
    const dom = new FakeDom();
    const key = dom.add('kStore');
    const { bus, guard } = setup();
    const stop = showStoreMode(bus);
    guard.set(true);
    expect([key.classList.contains('on'), dom.body.classList.contains('storing')]).toEqual([true, true]);
    guard.set(false);
    expect([key.classList.contains('on'), dom.body.classList.contains('storing')]).toEqual([false, false]);
    stop();
    guard.set(true);
    expect(key.classList.contains('on')).toBe(false);
  });
});
