// Copied from index.base.html 1664-1692 (computeOutput); globals come from `env`, `f.sel` is env.selected.
import { ATTR, type AttrName } from '../../../../../src/domain/attributes';
import { fxEval, type LSample } from './legacyPhaser';
import type { LegacyEnv } from './legacyEnv';
import type { LRef } from './legacyTypes';

const fxTmp: LSample = {};
export function computeOutput(env: LegacyEnv, now: number): void {
  const { prog, autoExec, autoPump, autoHitUntil, highlight, blackout, gm } = env;
  const has = (f: { T: { attrs: readonly string[] } }, a: string): boolean => f.T.attrs.includes(a);
  const active = env.allExecs.filter((e) => e.on && (e.level > 0 || e.flash)).sort((a, b) => a.lastGo - b.lastGo);
  for (const f of env.fixtures) {
    const o = f.out as Record<string, number>,
      T = f.T;
    o.dim = 0;
    o.pan = f.fixed ? f.fixed.pan : 0;
    o.tilt = f.fixed ? f.fixed.tilt : 0;
    o.r = o.g = o.b = 100;
    if (T.defColor) [o.r, o.g, o.b] = T.defColor;
    o.zoom = T.z0;
    o.gobo = 0;
    o.grot = 0;
    o.strobe = 0;
    if (f.type === 'screen') o.gobo = 1;
    const fxSel: Record<string, { r: LRef; lv: number } | null> = { pos: null, dim: null, color: null };
    for (const e of active) {
      const lv = (e.flash ? 1 : e.level) * (e.auto && (f.type === 'beam' || f.type === 'spot') ? autoPump : 1),
        v = e.vals[f.id];
      if (v)
        for (const a in v) {
          if (a === 'dim') o.dim = Math.max(o.dim, (v.dim as number) * lv);
          else o[a] = v[a] as number;
        }
      for (const ft of ['pos', 'dim', 'color']) {
        const r = e.fx[f.id + '|' + ft];
        if (r) fxSel[ft] = { r, lv };
      }
    }
    if (f.type === 'blinder' && autoHitUntil > now && autoExec.on) o.dim = Math.max(o.dim, 100 * autoExec.level);
    const pv = prog.vals[f.id];
    if (pv)
      for (const a in pv) {
        o[a] = pv[a] as number;
        fxSel[ATTR[a as AttrName].feat] = null;
      }
    for (const ft of ['pos', 'dim', 'color']) {
      const r = prog.fx[f.id + '|' + ft];
      if (r) fxSel[ft] = { r, lv: 1 };
    }
    Object.assign(f.base, o);
    for (const ft in fxSel) {
      const s = fxSel[ft];
      if (!s) continue;
      fxTmp.dp = fxTmp.dt = 0;
      fxEval(env, s.r, f, now, fxTmp);
      if (ft === 'pos' && T.moving) {
        o.pan += fxTmp.dp;
        o.tilt += fxTmp.dt;
      }
      if (ft === 'dim' && has(f, 'dim')) o.dim = (fxTmp.dim as number) * s.lv;
      if (ft === 'color' && has(f, 'r')) {
        o.r = fxTmp.r as number;
        o.g = fxTmp.g as number;
        o.b = fxTmp.b as number;
      }
    }
    if (T.tiltOnly) o.pan = 0;
    if (highlight && env.selected.has(f.id)) {
      o.dim = 100;
      o.r = o.g = o.b = 100;
      o.strobe = 0;
      o.gobo = f.type === 'screen' ? 0 : 0;
    }
    o.dim *= blackout ? 0 : gm;
  }
}
