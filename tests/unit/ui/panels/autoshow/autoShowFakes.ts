import { vi } from 'vitest';
import { defaultAutoSettings } from '../../../../../src/autoshow/AutoSettings';
import { STYLES } from '../../../../../src/autoshow/styles';
import { EventBus } from '../../../../../src/core';
import { AppState } from '../../../../../src/engine/AppState';
import type { EngineEvents, EngineMessage } from '../../../../../src/engine/events';
import type { AutoShowDeps } from '../../../../../src/ui/panels/autoshow/AutoShowDeps';

/** An executor with only what the look buttons touch. */
export const fakeExec = (cues: { num: number }[] = []) => ({
  name: '',
  cues,
  invalidate: vi.fn(),
  resetTracking: vi.fn(),
});

/** Auto Show deps over fakes: a settable auto-show, three executors, a 120 BPM tempo and a message log. */
export function autoShowDeps() {
  const bus = new EventBus<EngineEvents>(),
    messages: EngineMessage[] = [],
    settings = defaultAutoSettings();
  bus.on('message', (m) => messages.push(m));
  const auto = {
    on: false,
    section: 'verse',
    settings,
    get style() {
      return STYLES[settings.style];
    },
    barsPerLook: () => 4,
    selectStyle: vi.fn((id: typeof settings.style) => (settings.style = id)),
    start: vi.fn(),
    stop: vi.fn(),
    newLook: vi.fn(),
  };
  const execs = [fakeExec([{ num: 2.5 }]), fakeExec(), fakeExec()];
  const pool = { execs, autoExec: fakeExec([{ num: 1, sec: 'drop' } as { num: number }]) };
  const looks = { generate: vi.fn(() => ({ num: 0, name: '', sec: 'x' })) };
  const song = { toggle: vi.fn(), load: vi.fn() };
  const storage = { persist: vi.fn() };
  const tempo = { bpm: 120, beatOrigin: 0 };
  const state = new AppState(bus);
  const fakes = { auto, pool, looks, song, storage, tempo, state, execs, messages, bus };
  const deps = { ...fakes, sideTab: () => 'auto' } as unknown as AutoShowDeps;
  return { deps, ...fakes };
}
