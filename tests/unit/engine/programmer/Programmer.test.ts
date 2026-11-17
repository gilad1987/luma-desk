import { describe, expect, it } from 'vitest';
import { programmerWorlds } from './worlds';

/** A fresh engine side with the clock at `t` seconds. */
function engineAt(t: number) {
  const w = programmerWorlds();
  w.setTime(t);
  return w.engine;
}

describe('Programmer', () => {
  it('reports a stored cue as log, toast, repaint, save, then cueStored', () => {
    const e = engineAt(1);
    e.programmer.set(101, 'dim', 50);
    e.programmer.storeCue(0, null, {});
    expect(e.messages).toEqual([
      'ok:Stored Cue 1 in Exec 1 (Seq 1)',
      'toast:Cue 1 stored → Exec 1',
      'stateDirty',
      'showChanged',
      'cueStored:0.1',
    ]);
    expect(Object.keys(e.pool.execs[0]?.cues[0] ?? {})).toEqual(['num', 'name', 'fade', 'vals', 'fx']);
  });

  it('numbers the next cue after the last whole number', () => {
    const e = engineAt(1);
    e.programmer.set(101, 'dim', 50);
    e.programmer.storeCue(0, 2.5, {});
    e.programmer.storeCue(0, null, {});
    expect(e.pool.execs[0]?.cues.map((c) => c.num)).toEqual([2.5, 3]);
  });

  it('refuses to store an empty programmer and throws on an executor that does not exist', () => {
    const e = engineAt(1);
    e.programmer.storeCue(0, null, {});
    expect(e.messages).toEqual(['er:Store: programmer is empty']);
    e.programmer.set(101, 'dim', 50);
    expect(() => e.programmer.storeCue(10, null, {})).toThrow(RangeError);
  });

  it('neither compacts nor reindexes when no selected fixture can run the phaser', () => {
    const e = engineAt(1);
    const moving = e.rig.fixtures.find((f) => f.T.moving);
    const fixed = e.rig.fixtures.find((f) => !f.T.moving);
    if (!moving || !fixed) throw new Error('rig has no fixture for this check');
    e.selection.set([moving.id]);
    e.programmer.applyPhaser('circle');
    const { fxList, fx } = e.programmer;
    e.selection.set([fixed.id]);
    e.programmer.applyPhaser('pan');
    expect(e.messages.at(-1)).toBe('toast:Selected fixtures do not support this phaser');
    expect(e.programmer.fxList).toBe(fxList);
    expect(e.programmer.fx).toBe(fx);
  });

  it('turns a second CLEAR within 400 ms into Clear All', () => {
    const e = engineAt(10);
    e.state.highlight = true;
    e.selection.set([101]);
    e.programmer.set(101, 'dim', 50);
    e.programmer.clearPress();
    e.clock.seconds = 10.399;
    e.programmer.clearPress();
    expect(e.messages.filter((m) => m.includes('Clear'))).toEqual([':Clear Selection', 'ok:Clear All']);
    expect([e.programmer.hasContent(), e.state.highlight, e.state.lastClear]).toEqual([false, false, 10399]);
    e.clock.seconds = 10.799;
    e.programmer.clearPress();
    expect(e.messages.at(-2)).toBe(':Clear Programmer');
  });

  it('rounds stepped attributes, clamps zoom to the fixture type and ignores attributes a fixture lacks', () => {
    const e = engineAt(1);
    const f = e.rig.fixtures.find((x) => x.has('gobo') && x.has('zoom'));
    const plain = e.rig.fixtures.find((x) => !x.has('gobo'));
    if (!f || !plain) throw new Error('rig has no fixture for this check');
    e.programmer.set(f.id, 'gobo', 2.6);
    e.programmer.set(f.id, 'zoom', 1000);
    e.programmer.set(f.id, 'dim', 33.3333);
    e.programmer.set(plain.id, 'gobo', 3);
    expect(e.programmer.vals[f.id]).toEqual({ gobo: 3, zoom: f.T.zr[1], dim: 33.33 });
    expect(e.programmer.vals[plain.id]).toBeUndefined();
  });

  it('colours lit fixtures only above dimmer 1 when nothing is selected', () => {
    const e = engineAt(1);
    const [a, b] = e.rig.fixtures;
    if (!a || !b) throw new Error('rig has no fixture for this check');
    a.out.dim = 1;
    b.out.dim = 1.01;
    expect(e.programmer.colorTargets()).toEqual([b.id]);
    expect(e.messages).toEqual(['toast:אין בחירה — הצבע הוחל על כל 1 הגופים הדולקים']);
  });
});
