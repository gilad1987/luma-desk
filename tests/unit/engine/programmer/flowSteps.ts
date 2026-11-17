import { execGo } from '../playback/oracle/legacyPlayback';
import { storePresetOracle } from '../state/oracle/storeOracle';
import { clearAllCmd, clearProg, doClear, storeCue } from './oracle/legacyClearStore';
import { setSel } from './oracle/progEnv';
import type { Step } from './operations';
import * as I from './randomInputs';
import type { Worlds } from './worlds';

const advance = (w: Worlds, dt: number): void => w.setTime(w.env.now + dt);

/** Steps around the programmer: selection, CLEAR, stores, playback, frames and highlight. */
export const FLOW_STEPS: Record<string, Step> = {
  select: (w, r) => {
    const ids = I.randomIds(r, w),
      mode = I.pick(r, I.MODES);
    return [`select ${mode} ${ids.join(',')}`, w.engine.selection.set([...ids], mode), setSel(w.env, [...ids], mode)];
  },
  clearPress: (w, r) => {
    advance(w, I.pick(r, [0.05, 0.2, 0.399, 0.401, 0.8, 2]));
    return ['CLEAR', w.engine.programmer.clearPress(), doClear(w.env)];
  },
  clearAll: ({ engine, env }) => ['clear all', engine.programmer.clearAll(), clearAllCmd(env)],
  clear: ({ engine, env }) => ['clear programmer', engine.programmer.clear(), clearProg(env)],
  storeCue: ({ engine, env }, r) => {
    const ex = Math.floor(r() * (r() < 0.8 ? 3 : 10)),
      opts = I.randomStoreOptions(r);
    const num = r() < 0.5 ? null : I.pick(r, [0, 1, 2, 2.5, 3, 7]);
    const label = `store cue ${ex} ${num} ${JSON.stringify(opts)}`;
    return [label, engine.programmer.storeCue(ex, num, { ...opts }), storeCue(env, ex, num, { ...opts })];
  },
  storePreset: ({ engine, env }, r) => {
    const t = I.pick(r, I.POOLS),
      s = 1 + Math.floor(r() * 20),
      calls: string[] = [];
    engine.presets.storeFromProgrammer(t, s, engine.selection.ids, engine.programmer.vals);
    storePresetOracle(env.presets, env.sel, env.prog.vals, t, s, calls);
    env.messages.push(...calls.map((c) => (c.startsWith('log:') ? c.slice(4) : c)));
    return [`store preset ${t}.${s}`, 0, 0];
  },
  go: ({ engine, env }, r) => {
    const i = Math.floor(r() * 3),
      e = engine.pool.execs[i],
      le = env.execs[i];
    if (!e || !le) throw new RangeError(`no executor ${i}`);
    return [`go ${i}`, engine.pool.go(e), execGo(env, le)];
  },
  frame: (w, r) => {
    w.frame(w.env.now + r() * 1.5);
    return ['frame', 0, 0];
  },
  highlight: ({ engine, env }) => {
    engine.state.highlight = env.highlight = !env.highlight;
    return ['highlight', 0, 0];
  },
};
