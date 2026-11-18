import { progHasContent, removePhasers, selFxInsts } from './oracle/legacyClearStore';
import { applyFx, applyPreset, colorTargets, progRemoveFeat, progSet } from './oracle/legacyProgrammer';
import type { Step } from './operations';
import * as I from './randomInputs';

/** Steps that edit or query the programmer itself. */
export const EDIT_STEPS: Record<string, Step> = {
  set: (w, r) => {
    const id = I.pick(r, [...I.randomIds(r, w), 101, 9999]),
      a = I.pick(r, I.ATTRS),
      v = I.randomValue(r);
    return [`set ${id} ${a} ${v}`, w.engine.programmer.set(id, a, v), progSet(w.env, id, a, v)];
  },
  setSelection: ({ engine, env }, r) => {
    const a = I.pick(r, I.ATTRS),
      v = I.randomValue(r);
    for (const id of engine.selection.ids) engine.programmer.set(id, a, v);
    for (const id of env.sel) progSet(env, id, a, v);
    return [`set selection ${a} ${v}`, 0, 0];
  },
  removeFeature: (w, r) => {
    const ids = r() < 0.6 ? [...w.env.sel] : I.randomIds(r, w),
      ft = I.pick(r, I.FEATURES);
    return [
      `knockout ${ft} ${ids.join(',')}`,
      w.engine.programmer.removeFeature(ids, ft),
      progRemoveFeat(w.env, ids, ft),
    ];
  },
  applyPreset: ({ engine, env }, r) => {
    const t = I.pick(r, I.POOLS),
      s = 1 + Math.floor(r() * 18);
    return [`preset ${t}.${s}`, engine.programmer.applyPreset(t, s), applyPreset(env, t, s)];
  },
  applyPhaser: ({ engine, env }, r) => {
    const t = I.pick(r, I.PHASERS);
    return [`phaser ${t}`, engine.programmer.applyPhaser(t), applyFx(env, t)];
  },
  removePhasers: ({ engine, env }) => [
    'remove phasers',
    engine.programmer.removePhasers(engine.selection.ids),
    removePhasers(env),
  ],
  phasersOnSelection: ({ engine: { programmer: p }, env }) => [
    'phasers on selection',
    p.phasersOnSelection().map((i) => p.fxList.indexOf(i)),
    selFxInsts(env).map((i) => env.prog.fxList.indexOf(i)),
  ],
  colorTargets: ({ engine, env }) => ['color targets', engine.programmer.colorTargets(), colorTargets(env)],
  hasContent: ({ engine, env }) => ['has content', engine.programmer.hasContent(), !!progHasContent(env)],
};
