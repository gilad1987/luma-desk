import { vi } from 'vitest';
import { defaultAutoSettings } from '../../../../../src/autoshow/AutoSettings';
import { LookGenerator } from '../../../../../src/autoshow/LookGenerator';
import type { Section } from '../../../../../src/autoshow/sections';
import { STYLES } from '../../../../../src/autoshow/styles';
import { EventBus } from '../../../../../src/core';
import { buildRig } from '../../../../../src/domain/rig';
import { AppState } from '../../../../../src/engine/AppState';
import type { Cue } from '../../../../../src/engine/CueList';
import type { EngineEvents, EngineMessage } from '../../../../../src/engine/events';
import { Executor } from '../../../../../src/engine/Executor';
import { Tempo } from '../../../../../src/engine/Tempo';
import type { AutoShowDeps } from '../../../../../src/ui/panels/autoshow/AutoShowDeps';

/** An empty cue numbered `num`, optionally labelled with a song section as the auto-show labels its looks. */
export const cue = (num: number, sec?: Section): Cue => ({
  num,
  name: '',
  fade: 0,
  vals: {},
  fx: [],
  ...(sec && { sec }),
});

/** A real executor holding `cues`. */
function exec(cues: Cue[] = []): Executor {
  const e = new Executor(false, { nowMs: () => 0, nowSeconds: () => 0 });
  e.cues = cues;
  return e;
}

/** Auto Show deps: a settable auto-show, three real executors, a real 120 BPM tempo and look generator, a message log. */
export function autoShowDeps() {
  const bus = new EventBus<EngineEvents>(),
    messages: EngineMessage[] = [],
    settings = defaultAutoSettings(),
    section: Section | '' = 'verse';
  bus.on('message', (m) => messages.push(m));
  const auto = {
    on: false,
    section,
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
  const execs = [exec([cue(2.5)]), exec(), exec()];
  const pool = { execs, autoExec: exec([cue(1, 'drop')]) };
  const looks = new LookGenerator(buildRig(), () => 0.5);
  const song = { toggle: vi.fn(), load: vi.fn() };
  const storage = { persist: vi.fn() };
  const tempo = new Tempo();
  const state = new AppState(bus);
  const fakes = { auto, pool, looks, song, storage, tempo, state, execs, messages, bus };
  const deps: AutoShowDeps = { ...fakes, sideTab: () => 'auto' };
  return { deps, ...fakes };
}
