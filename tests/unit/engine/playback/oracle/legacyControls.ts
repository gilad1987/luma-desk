// Copied from index.base.html 2143-2147 (setLevel) and 2163-2164 (flash press/release minus the DOM class).
import type { LegacyEnv } from './legacyEnv';
import { execOff, gotoCue } from './legacyPlayback';
import type { LExec } from './legacyTypes';

export function setLevel(env: LegacyEnv, e: LExec, v: number): void {
  const was = e.level;
  e.level = v;
  if (v > 0 && !e.on && e.cues.length) gotoCue(env, e, Math.max(0, e.cur));
  if (v === 0 && was > 0 && !e.flash) execOff(e);
}
export function flashDown(env: LegacyEnv, e: LExec): void {
  if (!e.cues.length) return;
  e.flash = true;
  if (!e.on) {
    e.flashOnly = true;
    gotoCue(env, e, Math.max(0, e.cur), 0);
  }
  e.lastGo = env.now;
}
export function flashUp(e: LExec): void {
  if (!e.flash) return;
  e.flash = false;
  if (e.flashOnly && e.level === 0) execOff(e);
  e.flashOnly = false;
}
