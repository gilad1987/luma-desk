import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { wireEngine } from '../../../../src/app/boot/wireEngine';
import { createShowFiles } from '../../../../src/app/uix/createShowFiles';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { defaultPoolOf } from '../../../../src/engine/stage/defaultPool';

// a show edit starts the delayed browser save; fake timers keep that save out of the test run
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** A real engine with the ids of its built-in rig, before any stage change. */
function bootEngine() {
  const engine = wireEngine();
  return { engine, builtInIds: new Set(engine.stage.rig.fixtures.map((f) => f.id)) };
}

const applyTheatre = (engine: ReturnType<typeof wireEngine>): void =>
  engine.stage.apply(createTemplate('theatre'), 'builder');

describe('wireEngine after a stage change', () => {
  it('drives a theatre fixture from the command line to the merged output, and skips a removed id', () => {
    const { engine, builtInIds } = bootEngine();
    applyTheatre(engine);
    const fixture = engine.stage.rig.fixtures[0];
    const gone = [...builtInIds].find((id) => !engine.stage.rig.get(id));
    if (gone === undefined) throw new Error('the theatre rig removed no built-in fixture id');
    const logs: string[] = [];
    engine.bus.on('message', (m) => logs.push(m.text));
    engine.runner.run(`Fixture ${gone} Thru ${gone}`);
    engine.programmer.set(gone, 'dim', 50);
    engine.runner.run(`Fixture ${fixture?.id} At 100`);
    engine.merger.compute(0, { pump: 1, hitUntil: 0 });
    expect([logs[0], engine.programmer.vals[gone]]).toEqual(['No fixtures match', undefined]);
    expect([engine.selection.ids, fixture?.out.dim]).toEqual([[fixture?.id], 100]);
  });

  it('prunes the selection, swaps the default pool and reports a cue of missing fixtures once', () => {
    const { engine, builtInIds } = bootEngine();
    engine.groupLibrary.replace(defaultPoolOf(engine.stage));
    const gone = [...builtInIds].find((id) => !createTemplate('theatre').fixtures.some((f) => f.id === id));
    engine.runner.run(`Fixture ${gone} At 50`);
    engine.runner.run('Store Exec 1');
    applyTheatre(engine);
    expect(engine.selection.ids).toEqual([]);
    expect(engine.groupLibrary.all).toEqual(defaultPoolOf(engine.stage));
    const logs: string[] = [];
    engine.bus.on('message', (m) => logs.push(m.text));
    engine.runner.run('Go+ Exec 1');
    expect(logs.filter((text) => text.includes('not on this stage'))).toEqual([
      'Exec 1 Cue 1: 1 fixture is not on this stage (skipped)',
    ]);
  });

  it('saves the stage with the show, and the demo keeps it', () => {
    const { engine } = bootEngine();
    const { serializer, demo } = createShowFiles({ ...engine, execs: engine.pool.execs });
    applyTheatre(engine);
    const design = engine.stage.design;
    expect(serializer.serialize().stage).toBe(design);
    demo.load();
    expect([engine.stage.design, engine.stage.cause]).toEqual([design, 'builder']);
  });
});
