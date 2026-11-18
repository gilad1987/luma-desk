import { describe, expect, it } from 'vitest';
import { EventBus, rng, type Clock } from '../../../src/core';
import { buildRig } from '../../../src/domain/rig';
import { AutoShow } from '../../../src/autoshow/AutoShow';
import { LookGenerator } from '../../../src/autoshow/LookGenerator';
import type { EngineEvents, EngineMessage } from '../../../src/engine/events';
import { ExecutorPool } from '../../../src/engine/ExecutorPool';
import { Tempo } from '../../../src/engine/Tempo';

const rig = buildRig();

/** An auto-show on a real executor pool and tempo, with a hand-moved clock and recorded side effects. */
function world(opts: { programmerHasContent?: boolean; bass?: number | null } = {}) {
  let now = 100;
  const clock: Clock = { nowSeconds: () => now, nowMs: () => now * 1000 };
  const bus = new EventBus<EngineEvents>();
  const messages: EngineMessage[] = [];
  bus.on('message', (m) => messages.push(m));
  const pool = new ExecutorPool(clock, bus);
  const tempo = new Tempo();
  let changes = 0;
  const show = new AutoShow({
    pool,
    programmer: { hasContent: () => opts.programmerHasContent ?? false },
    tempo,
    clock,
    looks: new LookGenerator(rig, rng(9)),
    bus,
    bassLevel: () => opts.bass ?? null,
    onChange: () => changes++,
  });
  const setNow = (t: number) => (now = t);
  return { show, pool, tempo, messages, setNow, changes: () => changes };
}

describe('AutoShow', () => {
  it('starts on the first section, takes the executors and anchors the beat grid', () => {
    const w = world({ programmerHasContent: true });
    w.pool.execs.forEach((e) => (e.on = true));
    w.show.start();
    expect(w.show.on).toBe(true);
    expect(w.pool.execs.every((e) => !e.on)).toBe(true);
    expect(w.tempo.beatOrigin).toBe(100);
    expect(w.show.section).toBe('groove');
    expect(w.pool.autoExec.cues[0]?.sec).toBe('groove');
    expect(w.pool.autoExec.on).toBe(true);
    expect(w.messages).toEqual([
      { kind: 'toast', text: 'Note: programmer values override Auto — press CLEAR twice to release' },
    ]);
    expect(w.changes()).toBe(1);
  });

  it('changes look on every 4th bar for EDM and follows the section cycle', () => {
    const w = world();
    w.tempo.setBpm(120);
    w.show.start();
    const changes = [`100:${w.show.section}`];
    let look = w.pool.autoExec.cues[0];
    // 120 BPM: one bar is 2 s; walk 16 bars in quarter-bar steps and record every new look
    for (let t = 100; t <= 132; t += 0.5) {
      w.setNow(t);
      w.show.tick(t);
      if (w.pool.autoExec.cues[0] !== look) changes.push(`${t}:${w.show.section}`);
      look = w.pool.autoExec.cues[0];
    }
    expect(changes).toEqual(['100:groove', '108:groove', '116:build', '124:drop', '132:groove']);
  });

  it('fires a blinder hit on big sections only and exposes it as modulation', () => {
    const w = world();
    w.show.settings.style = 'rock';
    w.show.start();
    expect(w.show.modulation).toEqual({ pump: 1, hitUntil: 0 });
    w.setNow(200);
    w.show.newLook();
    expect(w.show.section).toBe('chorus');
    expect(w.show.modulation.hitUntil).toBe(200.28);
  });

  it('updates the pump while off and stops the auto executor', () => {
    const w = world({ bass: 0.5 });
    w.show.settings.pulse = 'audio';
    w.show.tick(100);
    expect(w.show.modulation.pump).toBeCloseTo(0.4, 15);
    w.show.start();
    w.show.stop();
    expect(w.show.on).toBe(false);
    expect(w.pool.autoExec.on).toBe(false);
    expect(w.changes()).toBe(2);
  });

  it('restarts the section cycle when the style changes', () => {
    const w = world();
    w.show.start();
    w.show.newLook();
    w.show.selectStyle('techno');
    expect(w.show.section).toBe('groove');
    expect(w.show.barsPerLook()).toBe(8);
  });
});
