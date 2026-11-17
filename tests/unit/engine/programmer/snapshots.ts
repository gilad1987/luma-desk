import type { Executor } from '../../../../src/engine/Executor';
import type { FxIndex, PhaserInstance } from '../../../../src/engine/shared';
import type { LExec, LFx, LInst } from '../playback/oracle/legacyTypes';
import type { Worlds } from './worlds';

/** The fx index with each instance named by its place in the list (-1 if stale), so two worlds compare. */
function fxView(fx: FxIndex | LFx, list: readonly (PhaserInstance | LInst)[]) {
  return Object.entries(fx).map(([k, r]) => [k, list.indexOf(r.inst), r.idx, r.n, JSON.stringify(r.inst)]);
}

/** The executor state storeCue writes; JSON keeps key order, which saved shows depend on. */
function execView(e: Executor | LExec) {
  const { name, cur, on, level } = e;
  return {
    name,
    cur,
    on,
    level,
    cues: JSON.stringify(e.cues),
    vals: JSON.stringify(e.vals),
    fade: JSON.stringify(e.fade),
  };
}

/** Everything the programmer owns or writes, as plain data; the two sides must be strictly equal. */
export function engineSnapshot({ engine }: Worlds) {
  const { programmer: p, selection, state, pool, presets } = engine;
  return {
    vals: p.vals,
    valsJson: JSON.stringify(p.vals),
    fxList: JSON.stringify(p.fxList),
    fx: fxView(p.fx, p.fxList),
    sel: [...selection.ids],
    highlight: state.highlight,
    execs: pool.execs.map(execView),
    presets: JSON.stringify(presets.all),
    messages: [...engine.messages],
  };
}

export function legacySnapshot({ env }: Worlds) {
  const p = env.prog;
  return {
    vals: p.vals,
    valsJson: JSON.stringify(p.vals),
    fxList: JSON.stringify(p.fxList),
    fx: fxView(p.fx, p.fxList),
    sel: [...env.sel],
    highlight: env.highlight,
    execs: env.execs.map(execView),
    presets: JSON.stringify(env.presets),
    messages: [...env.messages],
  };
}

/** Every fixture's output; JSON keeps the key order the merge wrote. */
export function outputs(w: Worlds): { engine: string; legacy: string } {
  return {
    engine: JSON.stringify(w.engine.rig.fixtures.map((f) => [f.out, f.base])),
    legacy: JSON.stringify(w.env.fixtures.map((f) => [f.out, f.base])),
  };
}
