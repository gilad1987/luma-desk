import { describe, expect, it, vi } from 'vitest';
import type { Cue } from '../../../src/engine/CueList';
import { PRESET_TYPE_IDS, type PresetPools } from '../../../src/engine/presetTypes';
import { dropForeignIds } from '../../../src/show/startingShow/dropForeignIds';
import { sameFixtureIds } from '../../../src/show/startingShow/sameFixtureIds';
import { importedSourceOf, startingShowWorld } from '../../shared';

type SavedCues = { execs: { cues: { vals: object; fx: { ids: number[] }[] }[] }[] };

describe('StartingShow.keep', () => {
  it('drops cue values, effect ids, group ids and fixture presets of fixtures that are not the same any more', () => {
    const { world, stage, show } = startingShowWorld('festival');
    show.build();
    const before = show.before();
    expect(before.starting).toBe(true);
    stage.current = importedSourceOf('theatre');
    show.keep(before.rig);
    const ids = new Set(sameFixtureIds(before.rig, stage.current.rig));
    const saved = JSON.parse(world.json()) as SavedCues;
    for (const cue of saved.execs.flatMap((e) => e.cues)) {
      for (const id of Object.keys(cue.vals)) expect(ids.has(Number(id))).toBe(true);
      for (const fx of cue.fx) for (const id of fx.ids) expect(ids.has(id)).toBe(true);
    }
    for (const group of Object.values(world.groups.all)) for (const id of group.ids) expect(ids.has(id)).toBe(true);
    expect(world.events).toContain('showChanged');
  });

  it('reads a saved cue without vals or fx (or with fx false) as empty, as Tracking does', () => {
    const bare = { num: 1, name: '', fade: 0 };
    const exec = { cues: [bare, { ...bare, fx: false }] as unknown as Cue[], invalidate: vi.fn() };
    const pools = Object.fromEntries(PRESET_TYPE_IDS.map((type) => [type, {}])) as PresetPools;
    const presetLibrary = { all: pools, replace: vi.fn() };
    dropForeignIds({ execs: [exec], groupLibrary: { all: {}, replace: vi.fn() }, presetLibrary }, new Set([1]));
    expect(exec.cues).toEqual([1, 2].map(() => ({ ...bare, vals: {}, fx: [] })));
    expect(exec.invalidate).toHaveBeenCalledOnce();
  });
});
