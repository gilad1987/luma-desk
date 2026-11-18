import { describe, expect, it } from 'vitest';
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
});
