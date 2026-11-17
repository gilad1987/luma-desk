// Copied from index.base.html 1643-1662 (stepFades).
import type { LegacyEnv } from './legacyEnv';
import { deep } from './legacyPlayback';
import type { LVals } from './legacyTypes';

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

export function stepFades(env: LegacyEnv, now: number): void {
  for (const e of env.allExecs) {
    const F = e.fade;
    if (!F) continue;
    if (F.paused) continue;
    const p = F.dur > 0 ? clamp((now - F.t0) / F.dur, 0, 1) : 1,
      k = p * p * (3 - 2 * p);
    if (p >= 1) {
      e.vals = deep(F.to);
      e.fade = null;
      continue;
    }
    const v: LVals = {};
    const ids = new Set([...Object.keys(F.from), ...Object.keys(F.to)]);
    for (const id of ids) {
      const a = F.from[id] || {},
        b = F.to[id] || {},
        o: Record<string, number | undefined> = (v[id] = {});
      for (const at of new Set([...Object.keys(a), ...Object.keys(b)])) {
        let fa = a[at],
          fb = b[at];
        if (at === 'dim') {
          fa = fa ?? 0;
          fb = fb ?? 0;
        } else {
          if (fa == null) fa = fb;
          if (fb == null) {
            if (k < 1) o[at] = fa;
            continue;
          }
        }
        o[at] = at === 'gobo' ? (k < 0.5 ? fa : fb) : (fa as number) + (fb - (fa as number)) * k;
      }
    }
    e.vals = v;
  }
}
