import { jsonClone } from '../../../../src/core';
import type { Cue } from '../../../../src/engine/CueList';
import { indexFx } from '../../../../src/engine/shared';
import type { EngineWorld } from './engineWorld';
import { flashDown, flashUp, setLevel } from './oracle/legacyControls';
import type { LegacyWorld } from './legacyWorld';
import { execGo, execOff, execPause, gotoCue, invalidate } from './oracle/legacyPlayback';
import { rebuildProgFx } from './oracle/legacyPhaser';
import type { LVals } from './oracle/legacyTypes';

/** One operator or show action, applied identically to the refactored engine and the original code. */
export type Action =
  | { kind: 'load'; exec: number; cues: Cue[] }
  | { kind: 'go'; exec: number; dir: 1 | -1 }
  | { kind: 'goto'; exec: number; index: number; fade?: number }
  | { kind: 'pause' | 'off' | 'flashPress' | 'flashRelease'; exec: number }
  | { kind: 'level'; exec: number; level: number }
  | { kind: 'editCue'; exec: number; index: number; cue: Cue }
  | { kind: 'programmer'; vals: Cue['vals']; fxList: Cue['fx'] }
  | { kind: 'master'; gm: number; blackout: boolean; highlight: boolean; selected: number[] }
  | { kind: 'tempo'; bpm: number; beatOrigin: number }
  | { kind: 'modulation'; pump: number; hitUntil: number };

/** Applies `act` to both worlds; executor 10 is the auto executor. */
export function applyAction(act: Action, now: EngineWorld, old: LegacyWorld): void {
  if (!('exec' in act)) return applyGlobal(act, now, old);
  const e = act.exec === 10 ? now.pool.autoExec : now.pool.execs[act.exec];
  const l = old.env.allExecs[act.exec];
  if (!e || !l) throw new Error(`no executor ${act.exec}`);
  switch (act.kind) {
    case 'load':
      e.cues = jsonClone(act.cues);
      e.resetTracking();
      l.cues = jsonClone(act.cues);
      l.cache = {};
      return;
    case 'go':
      now.pool.go(e, act.dir);
      return execGo(old.env, l, act.dir);
    case 'goto':
      e.goto(act.index, act.fade);
      return gotoCue(old.env, l, act.index, act.fade);
    case 'pause':
      e.pause();
      return execPause(old.env, l);
    case 'off':
      e.off();
      return execOff(l);
    case 'flashPress':
      now.pool.flashPress(e);
      return flashDown(old.env, l);
    case 'flashRelease':
      now.pool.flashRelease(e);
      return flashUp(l);
    case 'level':
      now.pool.setLevel(e, act.level);
      return setLevel(old.env, l, act.level);
    case 'editCue':
      if (!e.cues[act.index]) return;
      e.cues[act.index] = jsonClone(act.cue);
      e.invalidate();
      l.cues[act.index] = jsonClone(act.cue);
      return invalidate(l);
  }
}

function applyGlobal(act: Action, now: EngineWorld, old: LegacyWorld): void {
  const env = old.env;
  if (act.kind === 'programmer') {
    now.programmer.vals = jsonClone(act.vals);
    now.programmer.fxList = jsonClone(act.fxList);
    now.programmer.fx = {};
    for (const inst of now.programmer.fxList) indexFx(now.programmer.fx, inst);
    env.prog.vals = jsonClone<LVals>(act.vals);
    env.prog.fxList = jsonClone(act.fxList);
    rebuildProgFx(env);
  } else if (act.kind === 'master') {
    Object.assign(now.master, { gm: act.gm, blackout: act.blackout, highlight: act.highlight });
    Object.assign(env, { gm: act.gm, blackout: act.blackout, highlight: act.highlight });
    now.selected.clear();
    env.selected.clear();
    for (const id of act.selected) {
      now.selected.add(id);
      env.selected.add(id);
    }
  } else if (act.kind === 'tempo') {
    Object.assign(now.tempo, { bpm: act.bpm, beatOrigin: act.beatOrigin });
    Object.assign(env, { bpm: act.bpm, beatOrigin: act.beatOrigin });
  } else if (act.kind === 'modulation') {
    Object.assign(now.modulation, { pump: act.pump, hitUntil: act.hitUntil });
    Object.assign(env, { autoPump: act.pump, autoHitUntil: act.hitUntil });
  }
}
