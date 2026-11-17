// Copied from index.base.html: has 1574, colorTargets 1575-1579, progSet..applyFx 1804-1833.
// Changes: types and casts only; globals come from `env`, log/toast record to env.messages.
import { ATTR, FEAT_ATTRS, type AttrSpec } from '../../../../../src/domain/attributes';
import type { Fixture } from '../../../../../src/domain/Fixture';
import { FXT, rebuildProgFx } from '../../playback/oracle/legacyPhaser';
import { presetValsOracle as presetVals } from '../../state/oracle/storeOracle';
import { log, toast, type ProgEnv } from './progEnv';

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v); // 687
const has = (f: Fixture, a: string): boolean => (f.T.attrs as readonly string[]).includes(a);
const ATTRS = ATTR as Record<string, AttrSpec>;
const FEATS = FEAT_ATTRS as Record<string, readonly string[] | undefined>;
const feat = (type: string): string => (FXT[type] as { feat: string }).feat;

export function colorTargets(env: ProgEnv): number[] {
  const { sel, FX, fixtures } = env;
  if (sel.length) {
    const ok = sel.filter((id) => has(FX[id] as Fixture, 'r'));
    if (!ok.length) toast(env, 'לגופים שנבחרו אין שליטת צבע');
    return ok;
  }
  const lit = fixtures.filter((f) => has(f, 'r') && (f.out.dim as number) > 1).map((f) => f.id);
  if (!lit.length) {
    toast(env, 'בחר קודם גופים (Group / לחיצה על הבמה) — אין כרגע גופים דולקים');
    return [];
  }
  toast(env, `אין בחירה — הצבע הוחל על כל ${lit.length} הגופים הדולקים`);
  return lit;
}
export function progSet(env: ProgEnv, id: number, attr: string, val: number): void {
  const f = env.FX[id];
  if (!f || !has(f, attr)) return;
  const A = ATTRS[attr] as AttrSpec;
  let mn = A.min,
    mx = A.max;
  if (attr === 'zoom') {
    mn = f.T.zr[0];
    mx = f.T.zr[1];
  }
  val = clamp(val, mn, mx);
  if (A.step) val = Math.round(val);
  (env.prog.vals[id] = env.prog.vals[id] || {})[attr] = +(+val).toFixed(2);
}
export function progRemoveFeat(env: ProgEnv, ids: number[], ft: string): void {
  const prog = env.prog;
  for (const id of ids) {
    const v = prog.vals[id];
    if (v) {
      for (const a of FEATS[ft] || []) delete v[a];
      if (!Object.keys(v).length) delete prog.vals[id];
    }
  }
  for (const inst of prog.fxList) if (feat(inst.type) === ft) inst.ids = inst.ids.filter((id) => !ids.includes(id));
  prog.fxList = prog.fxList.filter((i) => i.ids.length);
  rebuildProgFx(env);
}
export function applyPreset(env: ProgEnv, type: number, slot: number): void {
  const pr = env.presets[type]?.[slot];
  if (!pr) return;
  const ids = type === 4 ? colorTargets(env) : env.sel;
  if (!ids.length) {
    if (type !== 4) toast(env, 'בחר קודם גופים (Select fixtures first)');
    return;
  }
  ids.forEach((id, k) => {
    const f = env.FX[id] as Fixture,
      v = presetVals(pr, f, k, ids.length) as Record<string, number> | undefined;
    if (!v) return;
    for (const a in v) progSet(env, id, a, v[a] as number);
  });
  if (type === 2) {
    /* position preset also tidies running pos phasers */
  }
  log(env, `Preset ${type}.${slot} "${pr.name}"`, 'ok');
}
export function applyFx(env: ProgEnv, type: string): void {
  const { prog, sel, FX } = env;
  if (!sel.length) {
    toast(env, 'בחר קודם גופים (Select fixtures first)');
    return;
  }
  const def = FXT[type] as { name: string; feat: string; size: number },
    ft = def.feat;
  for (const inst of prog.fxList) if (feat(inst.type) === ft) inst.ids = inst.ids.filter((id) => !sel.includes(id));
  const ids = sel.filter((id) => {
    const f = FX[id] as Fixture;
    return ft === 'pos' ? f.T.moving : ft === 'color' ? has(f, 'r') : has(f, 'dim');
  });
  if (!ids.length) {
    toast(env, 'Selected fixtures do not support this phaser');
    return;
  }
  prog.fxList = prog.fxList.filter((i) => i.ids.length);
  prog.fxList.push({ type, rate: 1, size: def.size, spread: 360, ids: [...ids] });
  rebuildProgFx(env);
  log(env, `Phaser ${def.name} → ${ids.length} fixtures`, 'ok');
}
