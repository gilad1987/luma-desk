/**
 * F25: the programmer in the wired engine across a stage change. Owns the `rigChanged` prune of programmer values and
 * phaser members; how each programmer operation works is owned by `../../programmer/`.
 */
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../../../src/domain/stage/templates';
import { rigWorld } from './rigWorld';

/** A world whose programmer holds a dim value and a dim phaser on built-in ids the theatre has and lacks. */
function programmedWorld() {
  const w = rigWorld();
  const theatreIds = new Set(createTemplate('theatre').fixtures.map((f) => f.id));
  const builtInIds = w.service.rig.fixtures.map((f) => f.id);
  const kept = builtInIds.filter((id) => theatreIds.has(id)).slice(0, 2);
  const gone = builtInIds.filter((id) => !theatreIds.has(id)).slice(0, 2);
  for (const id of [...kept, ...gone]) w.programmer.set(id, 'dim', 50);
  w.selection.set([...kept, ...gone]);
  w.programmer.applyPhaser('dimSine');
  w.lines.length = 0;
  return { w, kept, gone };
}

describe('programmer across a stage change (F25)', () => {
  it('keeps only the theatre ids in the values and the phasers, and asks for one repaint', () => {
    const { w, kept, gone } = programmedWorld();
    expect([kept.length, gone.length]).toEqual([2, 2]);
    w.to('theatre');
    expect(Object.keys(w.programmer.vals).map(Number)).toEqual(kept);
    expect(w.programmer.fxList.map((inst) => inst.ids)).toEqual([kept]);
    expect(Object.keys(w.programmer.fx)).toEqual(kept.map((id) => `${id}|dim`));
    expect(w.count('stateDirty')).toBe(1);
  });

  it('empties the programmer on the empty stage', () => {
    const { w } = programmedWorld();
    w.to('empty');
    expect([w.programmer.vals, w.programmer.fxList, w.programmer.fx]).toEqual([{}, [], {}]);
    expect(w.programmer.hasContent()).toBe(false);
  });

  it('changes nothing and asks for no repaint when the built-in stage is applied again', () => {
    const { w, kept, gone } = programmedWorld();
    const vals = structuredClone(w.programmer.vals);
    const fxList = w.programmer.fxList;
    w.to('sultans-pool');
    expect(w.programmer.vals).toEqual(vals);
    expect(w.programmer.fxList).toBe(fxList);
    expect(fxList.map((inst) => inst.ids)).toEqual([[...kept, ...gone]]);
    expect(w.count('stateDirty')).toBe(0);
  });

  it('keeps every value through a builder preview, so Cancel gives the operator the programmer back', () => {
    const { w } = programmedWorld();
    const vals = structuredClone(w.programmer.vals);
    const ids = w.programmer.fxList.map((inst) => inst.ids);
    w.to('theatre', 'preview');
    w.to('sultans-pool', 'preview');
    expect([w.programmer.vals, w.programmer.fxList.map((inst) => inst.ids)]).toEqual([vals, ids]);
  });
});
