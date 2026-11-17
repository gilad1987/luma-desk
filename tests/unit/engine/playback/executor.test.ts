import { describe, expect, it } from 'vitest';
import type { Cue } from '../../../../src/engine/CueList';
import { engineWorld } from './engineWorld';

const cues = (): Cue[] => [
  { num: 1, name: 'A', fade: 1, vals: { 101: { dim: 50, gobo: 2 } }, fx: [] },
  { num: 2, name: 'B', fade: 0, vals: { 101: { gobo: 5 }, 102: { dim: 100 } }, fx: [] },
];

function loaded() {
  const w = engineWorld();
  const e = w.pool.execs[2];
  if (!e) throw new Error('executor 3 missing');
  e.cues = cues();
  return { w, e };
}

describe('Executor and ExecutorPool', () => {
  it('builds ten operator executors and one auto executor with the same defaults', () => {
    const { pool } = engineWorld();
    expect(pool.execs).toHaveLength(10);
    expect(pool.all).toEqual([...pool.execs, pool.autoExec]);
    expect([pool.autoExec.name, pool.autoExec.auto, pool.autoExec.flashOnly]).toEqual(['AUTO', true, false]);
  });

  it('GO on an empty executor only toasts', () => {
    const w = engineWorld();
    w.pool.go(w.pool.execs[0] ?? w.pool.autoExec);
    expect(w.messages).toEqual(['toast:Executor is empty — STORE a cue first']);
  });

  it('GO raises a stopped executor at level 0, logs with the executor number and wraps both ways', () => {
    const { w, e } = loaded();
    w.pool.go(e);
    expect([e.level, e.cur, e.on]).toEqual([1, 0, true]);
    w.pool.go(e, -1);
    expect(e.cur).toBe(1);
    w.pool.go(e);
    expect(e.cur).toBe(0);
    expect(w.messages).toEqual(['ok:Exec 3: Cue 1 A', 'ok:Exec 3: Cue 2 B', 'ok:Exec 3: Cue 1 A']);
  });

  it('a fade shares the tracked target, copies the start values, and GO on a pause only resumes', () => {
    const { w, e } = loaded();
    w.clock.seconds = 10;
    e.goto(0, 4);
    expect(e.fade?.to).toBe(e.cache[0]?.vals);
    expect(e.fade?.dur).toBe(4);
    w.clock.seconds = 11;
    e.pause();
    w.clock.seconds = 20;
    w.pool.go(e);
    expect([e.cur, e.fade?.paused, e.fade?.t0]).toEqual([0, false, 19]);
  });

  it('tracking carries values forward; invalidate re-reads cues, resetTracking only drops the cache', () => {
    const { w, e } = loaded();
    e.goto(1, 0);
    w.frame(1);
    expect(e.vals).toEqual({ 101: { dim: 50, gobo: 5 }, 102: { dim: 100 } });
    e.cues[0] = { ...cues()[0], vals: { 101: { dim: 10 } } } as Cue;
    e.resetTracking();
    expect(e.vals[101]?.dim).toBe(50);
    e.invalidate();
    expect([e.vals[101]?.dim, e.fade]).toEqual([10, null]);
  });

  it('level and flash: fader 0 stops unless flashing; a flash-started executor stops on release', () => {
    const { w, e } = loaded();
    w.pool.flashPress(e);
    expect([e.on, e.flashOnly, e.fade?.dur]).toEqual([true, true, 0]);
    w.pool.flashRelease(e);
    expect([e.on, e.flash, e.flashOnly]).toEqual([false, false, false]);
    w.pool.setLevel(e, 0.5);
    expect([e.on, e.cur]).toEqual([true, 0]);
    w.pool.setLevel(e, 0);
    expect(e.on).toBe(false);
  });
});
