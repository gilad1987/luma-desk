// Copied from index.base.html 1612-1641; nowS/execs/log/toast come from `env`.
import { ATTR, type AttrName } from '../../../../../src/domain/attributes';
import { FXT } from './legacyPhaser';
import type { LegacyEnv } from './legacyEnv';
import type { LExec, LFx, LVals } from './legacyTypes';

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const deep = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
const feat = (a: string): string => ATTR[a as AttrName].feat;

export function tracked(e: LExec, i: number): { vals: LVals; fx: LFx } {
  if (e.cache[i]) return e.cache[i];
  const vals: LVals = {},
    fx: LFx = {};
  for (let c = 0; c <= i; c++) {
    const cue = e.cues[c];
    if (!cue) continue;
    for (const id in cue.vals) {
      const v = cue.vals[id];
      vals[id] = Object.assign(vals[id] || {}, v);
      for (const a in v) delete fx[id + '|' + feat(a)];
    }
    for (const inst of cue.fx || []) {
      const ft = FXT[inst.type]?.feat ?? '';
      inst.ids.forEach((id, idx) => (fx[id + '|' + ft] = { inst, idx, n: inst.ids.length }));
    }
  }
  return (e.cache[i] = { vals, fx });
}
export function gotoCue(env: LegacyEnv, e: LExec, i: number, fadeOverride?: number): void {
  const nowS = (): number => env.now;
  if (!e.cues.length) return;
  i = clamp(i, 0, e.cues.length - 1);
  const tr = tracked(e, i);
  const dur = fadeOverride != null ? fadeOverride : (e.cues[i]?.fade ?? 2);
  e.fade = { from: deep(e.vals), to: tr.vals, t0: nowS(), dur, paused: false };
  e.fx = tr.fx;
  e.cur = i;
  e.on = true;
  e.lastGo = nowS();
}
export function execGo(env: LegacyEnv, e: LExec, dir = 1): void {
  const nowS = (): number => env.now,
    toast = (t: string): number => env.messages.push('toast:' + t),
    log = (t: string, c: string): number => env.messages.push(c + ':' + t);
  if (!e.cues.length) {
    toast('Executor is empty — STORE a cue first');
    return;
  }
  if (e.fade && e.fade.paused) {
    e.fade.paused = false;
    e.fade.t0 = nowS() - (e.fade.pausedAt as number);
    return;
  }
  if (!e.on && e.level === 0) e.level = 1;
  let n = e.cur + dir;
  if (n >= e.cues.length) n = 0;
  if (n < 0) n = e.cues.length - 1;
  gotoCue(env, e, n);
  log(`Exec ${env.execs.indexOf(e) + 1}: Cue ${e.cues[n]?.num} ${e.cues[n]?.name}`, 'ok');
}
export function execOff(e: LExec): void {
  e.on = false;
  e.cur = -1;
  e.vals = {};
  e.fx = {};
  e.fade = null;
}
export function execPause(env: LegacyEnv, e: LExec): void {
  if (e.fade && !e.fade.paused) {
    e.fade.paused = true;
    e.fade.pausedAt = env.now - e.fade.t0;
  }
}
export function invalidate(e: LExec): void {
  e.cache = {};
  if (e.on && e.cur >= 0) {
    const tr = tracked(e, e.cur);
    e.vals = deep(tr.vals);
    e.fx = tr.fx;
    e.fade = null;
  }
}
