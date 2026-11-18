import { jsonClone } from '../../core';
import type { TestHookDeps } from './TestHookDeps';

/** The engine parts a command can change. */
export type DeskStateDeps = Pick<
  TestHookDeps,
  'selection' | 'programmer' | 'appState' | 'execs' | 'serializer' | 'deskMode'
>;

// the key order is the golden transcripts' order: a reorder shows as a diff in every transcript
const snapshot = (d: DeskStateDeps) => {
  const show = d.serializer.serialize();
  return jsonClone({
    sel: d.selection.ids,
    prog: d.programmer.vals,
    progFx: d.programmer.fxList,
    selExec: d.appState.selExec,
    highlight: d.appState.highlight,
    blackout: d.appState.blackout,
    deskMode: d.deskMode(),
    execs: d.execs.map((e) => ({
      name: e.name,
      cur: e.cur,
      on: e.on,
      level: e.level,
      cues: e.cues.map((c) => [c.num, c.name, c.fade]),
    })),
    groups: show.groups,
    presets: show.presets,
  });
};

/** The desk state as plain JSON data, so a spec diffs it and the app's later changes cannot reach the copy. */
export type DeskState = ReturnType<typeof snapshot>;

/**
 * A deep copy of the state a command can change. Groups and presets come from the show file, so a command that
 * edits them shows up in the transcript diff, not only in the next save.
 */
export function readDeskState(deps: DeskStateDeps): DeskState {
  return snapshot(deps);
}
