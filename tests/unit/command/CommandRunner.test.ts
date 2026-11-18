import { describe, expect, it } from 'vitest';
import type { Cue } from '../../../src/engine/CueList';
import { recordEvents } from '../../shared';
import { commandWorld } from './commandWorld';

/** A cue as `JSON.parse` gives it from a hand-edited show file without `vals`: saved shows are not validated. */
const bareCue = (num: number): Cue => JSON.parse(`{"num":${num},"name":"Bare","fade":0,"fx":[]}`) as Cue;

describe('CommandRunner', () => {
  it('ignores a blank line without asking for a repaint', () => {
    const world = commandWorld();
    const events = recordEvents(world.bus);
    world.runner.run('  ');
    expect(events).toEqual([]);
  });

  it('quirk C2: an unknown executor logs the browser TypeError text the original showed', () => {
    const world = commandWorld();
    expect(world.run('Go Exec 20').log).toEqual([
      ['er', "TypeError: Cannot read properties of undefined (reading 'cues')"],
    ]);
    expect(world.run('Off Exec 0').log).toEqual([
      ['er', "TypeError: Cannot set properties of undefined (setting 'on')"],
    ]);
    expect(world.run('Label Exec 11 X').log).toEqual([
      ['er', "TypeError: Cannot set properties of undefined (setting 'name')"],
    ]);
    expect(world.run('Store Exec 20').log).toEqual([['er', 'No such executor']]);
  });

  // known quirk J6: the original failed in execPause with (reading 'fade'); see docs/known-quirks.md
  it("quirk J6: Pause on a fractional executor logs (reading 'pause') (accepted change)", () => {
    const world = commandWorld();
    expect(world.run('Exec 2.5').log).toEqual([['ok', 'Exec 2.5 selected']]);
    expect(world.run('Pause').log).toEqual([
      ['er', "TypeError: Cannot read properties of undefined (reading 'pause')"],
    ]);
  });

  it('clamps Exec n and lets a later Store in the same line use the newly selected executor', () => {
    const world = commandWorld();
    expect(world.run('Exec 99').log).toEqual([['ok', 'Exec 10 selected']]);
    const entry = world.run('201 At 50 Exec 3 Store 7');
    expect(entry.toast).toBe('Cue 7 stored → Exec 3');
  });

  it('Delete keeps the current cue index inside the shorter list', () => {
    const world = commandWorld();
    world.run('Goto Cue 9');
    const entry = world.run('Delete Cue 9');
    expect(entry.log).toEqual([['ok', 'Deleted Cue 9']]);
    expect((entry.state as { execs: { cur: number }[] }).execs[0]?.cur).toBe(8);
  });

  it('Goto plays a saved cue without vals, which the original for...in skipped', () => {
    const world = commandWorld();
    world.pool.execs[0]?.cues.push(bareCue(99));
    expect(world.run('Goto Cue 99').log.filter(([level]) => level === 'er')).toEqual([]);
    const exec = world.pool.execs[0];
    expect(exec?.cur).toBe((exec?.cues.length ?? 0) - 1);
  });

  it('Delete re-tracks a running executor whose current cue is a saved cue without vals', () => {
    const world = commandWorld();
    // the booted Exec 1 is on at index 0, so the bare cue becomes the current cue that invalidate() tracks
    world.pool.execs[0]?.cues.unshift(bareCue(0.5));
    const events = recordEvents(world.bus);
    expect(world.run('Delete Cue 1').log).toEqual([['ok', 'Deleted Cue 1']]);
    expect(events).toContain('showChanged');
  });

  it('emits feedback, repaint and save requests in the original order', () => {
    const world = commandWorld();
    const events = recordEvents(world.bus);
    world.runner.run('Label Group 1 Front');
    expect(events).toEqual(['poolsChanged', 'log:ok:Labelled group 1: Front', 'showChanged', 'stateDirty']);
  });
});
