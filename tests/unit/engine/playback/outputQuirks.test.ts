import { describe, expect, it } from 'vitest';
import { engineWorld } from './engineWorld';

function world() {
  const w = engineWorld();
  const first = (type: 'beam' | 'spot' | 'follow' | 'blinder' | 'bar') => w.rig.idsOfType(type)[0] ?? -1;
  const ids = {
    beam: first('beam'),
    spot: first('spot'),
    follow: first('follow'),
    blinder: first('blinder'),
    bar: first('bar'),
  };
  const out = (id: number) => w.rig.get(id)?.out ?? {};
  const base = (id: number) => w.rig.get(id)?.base ?? {};
  return { w, ids, out, base };
}

describe('OutputMerger quirks kept from the original', () => {
  it('resets in the original key order (b, g, r) and the LED screen to gobo 1', () => {
    const { w, out } = world();
    w.frame(1);
    expect(Object.keys(out(2001))).toEqual(['dim', 'pan', 'tilt', 'b', 'g', 'r', 'zoom', 'gobo', 'grot', 'strobe']);
    expect(out(2001).gobo).toBe(1);
  });

  it('dimmer is HTP scaled by level; other attributes are LTP and ignore level; pump hits beams and spots only', () => {
    const { w, ids, out } = world();
    const [a, b] = w.pool.execs;
    if (!a || !b) throw new Error('executors missing');
    a.cues = [{ num: 1, name: '', fade: 0, vals: { [ids.spot]: { dim: 80, pan: 10 } }, fx: [] }];
    b.cues = [{ num: 1, name: '', fade: 0, vals: { [ids.spot]: { dim: 60, pan: 20 } }, fx: [] }];
    w.clock.seconds = 1;
    w.pool.setLevel(a, 0.5);
    w.clock.seconds = 2;
    w.pool.setLevel(b, 1);
    w.frame(5);
    expect([out(ids.spot).dim, out(ids.spot).pan]).toEqual([60, 20]);
    w.pool.autoExec.cues = [
      { num: 1, name: '', fade: 0, vals: { [ids.beam]: { dim: 100 }, [ids.follow]: { dim: 100 } }, fx: [] },
    ];
    w.pool.setLevel(w.pool.autoExec, 1);
    w.frame(6, { pump: 0.5, hitUntil: 0 });
    expect([out(ids.beam).dim, out(ids.follow).dim]).toEqual([50, 100]);
  });

  it('auto hit flashes blinders while the auto executor is on; programmer values stop the feature phaser', () => {
    const { w, ids, out, base } = world();
    w.pool.autoExec.cues = [
      {
        num: 1,
        name: '',
        fade: 0,
        vals: {},
        fx: [{ type: 'dimSine', rate: 1, size: 100, spread: 0, ids: [ids.spot] }],
      },
    ];
    w.pool.setLevel(w.pool.autoExec, 0.75);
    w.frame(3, { pump: 1, hitUntil: 3.5 });
    expect(out(ids.blinder).dim).toBe(75);
    expect(base(ids.spot).dim).toBe(0);
    expect(out(ids.spot).dim).toBeGreaterThan(0);
    w.programmer.vals = { [ids.spot]: { dim: 40 } };
    w.frame(4, { pump: 1, hitUntil: 3.5 });
    expect([out(ids.blinder).dim, out(ids.spot).dim]).toEqual([0, 40]);
  });

  it('tilt-only bars never pan; highlight shows selected fixtures white; blackout applies after highlight', () => {
    const { w, ids, out } = world();
    w.programmer.vals = { [ids.bar]: { pan: 30 }, [ids.spot]: { strobe: 50, r: 0 } };
    w.selected.add(ids.spot);
    w.master.highlight = true;
    w.frame(1);
    expect(out(ids.bar).pan).toBe(0);
    expect([out(ids.spot).dim, out(ids.spot).r, out(ids.spot).strobe]).toEqual([100, 100, 0]);
    w.master.blackout = true;
    w.frame(2);
    expect(out(ids.spot).dim).toBe(0);
  });

  it('fades: dimmer missing on one side is 0, gobo snaps at the half-way point, other attributes hold then vanish', () => {
    const { w, ids } = world();
    const e = w.pool.execs[0];
    if (!e) throw new Error('executor missing');
    e.vals = { [ids.spot]: { gobo: 1, zoom: 20 } };
    e.cues = [{ num: 1, name: '', fade: 2, vals: { [ids.spot]: { dim: 100, gobo: 4 } }, fx: [] }];
    w.clock.seconds = 0;
    e.goto(0);
    w.frame(0.9);
    expect(e.vals[ids.spot]?.gobo).toBe(1);
    expect(e.vals[ids.spot]?.zoom).toBe(20);
    w.frame(1.1);
    expect(e.vals[ids.spot]?.gobo).toBe(4);
    expect(e.vals[ids.spot]?.dim).toBeCloseTo(100 * 0.55 * 0.55 * (3 - 2 * 0.55));
    w.frame(2);
    expect(e.vals).toEqual({ [ids.spot]: { dim: 100, gobo: 4 } });
  });
});
