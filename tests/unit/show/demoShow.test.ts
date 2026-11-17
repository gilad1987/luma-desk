import { afterEach, describe, expect, it, vi } from 'vitest';
import { readGolden, type SavedShow } from '../../shared';
import { readSavedShow, showWorld } from './showWorld';

afterEach(() => vi.restoreAllMocks());

describe('DemoShow', () => {
  it('serialises to tests/golden/demo-show.json exactly, unrounded and key order included (JSON string equality)', () => {
    const world = showWorld();
    world.demo.load();
    expect(world.json()).toBe(JSON.stringify(readGolden('demo-show')));
  });

  it('matches, unrounded, the demo the pre-refactor app saved (old-show-v1 without its one added cue)', () => {
    const old = JSON.parse(readSavedShow('old-show-v1.json')) as SavedShow;
    const blinders = old.execs[1];
    if (blinders) blinders.cues = blinders.cues.filter((c) => c.num !== 5);
    const world = showWorld();
    world.demo.load();
    expect(world.json()).toBe(JSON.stringify(old));
  });

  it('starts cue 1 of executor 1, selects executor 1, and asks for one save, as buildDemo did', () => {
    const world = showWorld();
    world.state.selectExec(4);
    world.events.length = 0;
    world.demo.load();
    expect([world.execs[0]?.on, world.execs[0]?.cur, world.state.selExec]).toEqual([true, 0, 0]);
    expect(world.events).toEqual(['selectionChanged', 'stateDirty', 'showChanged']);
    expect([world.tempo.bpm, world.state.haze]).toEqual([124, 0.62]);
  });

  it('uses no randomness, so the determinism golden keeps its Math.random count', () => {
    const random = vi.spyOn(Math, 'random');
    showWorld().demo.load();
    expect(random).not.toHaveBeenCalled();
  });
});
