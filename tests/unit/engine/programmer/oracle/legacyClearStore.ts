// Copied from index.base.html: selFxInsts 1834, the "Remove Phasers" button 2129, clearProg 1835, doClear 1836-1843, progHasContent 1844, storeCue 1847-1864 and the
// runCmd `clearall` case 1927. Changes: types and casts; globals come from `env`; `performance.now()` is env.now in ms;
// `uiDirty.all = true` and `persist()` record the events that replace them. The `cueStored` line is the new event
// (no original call); it is recorded where the refactor emits it, after persist.
import { rebuildProgFx, FXT } from '../../playback/oracle/legacyPhaser';
import { deep, invalidate } from '../../playback/oracle/legacyPlayback';
import type { LCue, LInst } from '../../playback/oracle/legacyTypes';
import { log, setSel, toast, type ProgEnv } from './progEnv';

const feat = (type: string): string => (FXT[type] as { feat: string }).feat;

export function clearProg(env: ProgEnv): void {
  env.prog.vals = {};
  env.prog.fxList = [];
  rebuildProgFx(env);
}
export function clearAllCmd(env: ProgEnv): void {
  setSel(env, []);
  clearProg(env);
  env.highlight = false;
  log(env, 'Clear All', 'ok');
}
export function doClear(env: ProgEnv): void {
  const t = env.now * 1000;
  if (t - env.lastClear < 400) {
    setSel(env, []);
    clearProg(env);
    env.highlight = false;
    log(env, 'Clear All', 'ok');
  } else if (env.sel.length) {
    setSel(env, []);
    log(env, 'Clear Selection');
  } else {
    clearProg(env);
    env.highlight = false;
    log(env, 'Clear Programmer');
  }
  env.lastClear = t;
  env.messages.push('stateDirty');
}
export const progHasContent = (env: ProgEnv): number => Object.keys(env.prog.vals).length || env.prog.fxList.length;

export function storeCue(
  env: ProgEnv,
  ei: number,
  num: number | null,
  opts: { name?: string; fade?: number; merge?: boolean } = {},
): void {
  const e = env.execs[ei] as (typeof env.execs)[number],
    prog = env.prog;
  if (!progHasContent(env)) {
    log(env, 'Store: programmer is empty', 'er');
    return;
  }
  if (num == null) num = e.cues.length ? Math.floor((e.cues[e.cues.length - 1] as LCue).num) + 1 : 1;
  let cue = e.cues.find((c) => c.num === num);
  if (cue && !opts.merge) {
    cue.vals = {};
    cue.fx = [];
  }
  if (!cue) {
    cue = { num, name: opts.name || `Cue ${num}`, fade: opts.fade ?? 2, vals: {}, fx: [] };
    e.cues.push(cue);
    e.cues.sort((a, b) => a.num - b.num);
  }
  for (const id in prog.vals) cue.vals[id] = Object.assign(cue.vals[id] || {}, deep(prog.vals[id]));
  // cue-local phasers: remove stored fixtures from same-feature phasers in this cue, then add
  for (const inst of prog.fxList) {
    const ft = feat(inst.type);
    for (const old of cue.fx as LInst[])
      if (feat(old.type) === ft) old.ids = old.ids.filter((id) => !inst.ids.includes(id));
    cue.fx = (cue.fx as LInst[]).filter((i) => i.ids.length);
    cue.fx.push(deep(inst));
  }
  if (opts.fade != null) cue.fade = opts.fade;
  if (!e.name) e.name = `Seq ${ei + 1}`;
  invalidate(e);
  log(env, `Stored Cue ${num} in Exec ${ei + 1} (${e.name})`, 'ok');
  toast(env, `Cue ${num} stored → Exec ${ei + 1}`);
  env.messages.push('stateDirty', 'showChanged', `cueStored:${ei}.${num}`);
}
export const selFxInsts = (env: ProgEnv) => env.prog.fxList.filter((i) => i.ids.some((id) => env.sel.includes(id)));
export function removePhasers(env: ProgEnv): void {
  for (const inst of env.prog.fxList) inst.ids = inst.ids.filter((id) => !env.sel.includes(id));
  env.prog.fxList = env.prog.fxList.filter((i) => i.ids.length);
  rebuildProgFx(env);
}
