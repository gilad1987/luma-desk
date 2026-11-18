import { EventBus, jsonClone } from '../../../src/core';
import { buildRig } from '../../../src/domain/rig';
import { CommandRunner } from '../../../src/command/CommandRunner';
import { AppState } from '../../../src/engine/AppState';
import type { Cue } from '../../../src/engine/CueList';
import { defaultPresets } from '../../../src/engine/defaultPresets';
import type { EngineEvents } from '../../../src/engine/events';
import { ExecutorPool } from '../../../src/engine/ExecutorPool';
import { GroupLibrary, type GroupPool } from '../../../src/engine/GroupLibrary';
import { PresetLibrary } from '../../../src/engine/PresetLibrary';
import { Programmer } from '../../../src/engine/Programmer';
import { Selection } from '../../../src/engine/Selection';
import { readGolden } from '../../shared';

/** The parts of tests/golden/demo-show.json the boot reads. */
interface DemoShow {
  readonly groups: GroupPool;
  readonly execs: readonly { readonly name: string; readonly cues: Cue[]; readonly level: number }[];
}

/** One transcript entry as the Playwright test hook records it: log lines, the last toast, the state after it. */
export interface TranscriptEntry {
  readonly line: string;
  readonly log: readonly (readonly [string, string])[];
  readonly toast: string | null;
  readonly state: unknown;
}

/**
 * A real engine booted like the page boots the demo show (groups, default presets, executors, Exec 1 at its first
 * cue), with a CommandRunner on top. `run` answers in the transcript form, so goldens compare directly.
 */
export function commandWorld() {
  const rig = buildRig();
  const clock = { nowMs: () => 1_000_000, nowSeconds: () => 1000 };
  const bus = new EventBus<EngineEvents>();
  const state = new AppState(bus);
  const selection = new Selection(rig, bus);
  const groups = new GroupLibrary(bus);
  const presets = new PresetLibrary(bus);
  const pool = new ExecutorPool(clock, bus);
  const programmer = new Programmer({ rig, selection, presets, pool, state, clock, bus });
  const runner = new CommandRunner({ rig, selection, programmer, pool, state, groups, presets, bus });

  const demo = jsonClone(readGolden('demo-show') as DemoShow);
  groups.replace(demo.groups);
  presets.replace(defaultPresets());
  pool.execs.forEach((e, i) => {
    const saved = demo.execs[i];
    e.name = saved?.name ?? '';
    e.cues = saved?.cues ?? [];
    e.level = saved?.level ?? 0;
  });
  pool.execs[0]?.goto(0, 0);
  state.selectExec(0);

  let log: [string, string][] = [];
  let toast: string | null = null;
  bus.on('message', (m) => (m.kind === 'log' ? log.push([m.level, m.text]) : (toast = m.text)));

  /** The test hook's `state()`, without `deskMode`, which is UI state the command line never touches. */
  const snapshot = (): unknown =>
    jsonClone({
      sel: selection.ids,
      prog: programmer.vals,
      progFx: programmer.fxList,
      selExec: state.selExec,
      highlight: state.highlight,
      blackout: state.blackout,
      execs: pool.execs.map((e) => ({
        name: e.name,
        cur: e.cur,
        on: e.on,
        level: e.level,
        cues: e.cues.map((c) => [c.num, c.name, c.fade]),
      })),
      groups: groups.all,
      presets: Object.fromEntries(
        Object.entries(presets.all).map(([t, m]) => [
          t,
          Object.fromEntries(Object.entries(m).filter(([, p]) => p.kind !== 'fn')),
        ]),
      ),
    });

  const run = (line: string): TranscriptEntry => {
    log = [];
    toast = null;
    runner.run(line);
    return { line, log, toast, state: snapshot() };
  };
  return { run, bus, runner, pool };
}
