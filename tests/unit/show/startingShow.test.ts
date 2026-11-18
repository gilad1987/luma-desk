import { describe, expect, it } from 'vitest';
import { Rig } from '../../../src/domain/rig/Rig';
import { buildDemoShowFile } from '../../../src/show/demo/demoShowFile';
import { buildLegacyFirstLook } from '../../../src/show/mvrLook/legacy/legacyFirstLook';
import { MVR_FIRST_LOOK_NAME } from '../../../src/show/mvrLook/mvrFirstLook';
import { isStartingShow } from '../../../src/show/startingShow/isStartingShow';
import { sameFixtureIds } from '../../../src/show/startingShow/sameFixtureIds';
import { importedSourceOf, startingShowWorld, type showWorld } from '../../shared';

const reload = (world: ReturnType<typeof showWorld>): void => {
  world.serializer.load(JSON.parse(world.json()) as unknown);
};

describe('isStartingShow (the "unchanged demo show" rule)', () => {
  it('holds for an empty show and for the demo of the stage it was built for, also after a reload', () => {
    const { world, live, show } = startingShowWorld();
    expect(isStartingShow(world.execs, live)).toBe(true);
    show.build();
    expect(isStartingShow(world.execs, live)).toBe(true);
    reload(world);
    expect(isStartingShow(world.execs, live)).toBe(true);
  });

  it('holds with the MVR first look on executor 1 and the demo behind it', () => {
    const { world, live, show } = startingShowWorld();
    show.build();
    show.placeFirstLook();
    expect(world.execs[0]?.name).toBe(MVR_FIRST_LOOK_NAME);
    expect(isStartingShow(world.execs, live)).toBe(true);
  });

  it('still knows a show saved with the first look of the previous desk version (festival: 33, 20, 15)', () => {
    const { world, live, show } = startingShowWorld('festival');
    show.build();
    const [first] = world.execs;
    const legacy = buildLegacyFirstLook(live);
    if (first === undefined || legacy === null) throw new Error('no executor or no legacy look');
    expect([...new Set(Object.values(legacy.vals).map((vals) => vals?.dim))].sort()).toEqual([15, 20, 33]);
    first.name = MVR_FIRST_LOOK_NAME;
    first.cues = [legacy];
    reload(world);
    expect(isStartingShow(world.execs, live)).toBe(true);
    const [id] = Object.keys(legacy.vals);
    const saved = world.execs[0]?.cues[0];
    if (saved === undefined || id === undefined) throw new Error('the legacy look was not saved');
    saved.vals[Number(id)] = { ...saved.vals[Number(id)], dim: 13 };
    expect(isStartingShow(world.execs, live)).toBe(false);
  });

  // The looks of earlier versions are checked as recorded literals in `startingShow.literal.test.ts`: a look the
  // current code builds at an earlier balance would compare the code with itself.

  it('fails when the operator changed one cue value, on any executor', () => {
    const { world, live, show } = startingShowWorld();
    show.build();
    const cue = world.execs.flatMap((e) => e.cues).findLast((c) => Object.keys(c.vals).length > 0);
    const [id] = Object.keys(cue?.vals ?? {});
    if (cue === undefined || id === undefined) throw new Error('the demo has no cue values');
    cue.vals[id] = { ...cue.vals[id], dim: 13 };
    expect(isStartingShow(world.execs, live)).toBe(false);
  });

  it('fails for the demo of another stage', () => {
    const { world, live } = startingShowWorld('festival');
    const other = importedSourceOf('theatre');
    world.serializer.load(buildDemoShowFile(other.rig, other));
    expect(isStartingShow(world.execs, live)).toBe(false);
  });
});

describe('sameFixtureIds (the "same fixture" rule)', () => {
  it('keeps an id only when it is on both rigs with the same type', () => {
    const before = importedSourceOf('theatre').rig;
    const after = importedSourceOf('festival').rig;
    const kept = sameFixtureIds(before, after);
    const typeBefore = new Map(before.fixtures.map((f) => [f.id, f.type]));
    for (const f of after.fixtures) expect(kept.has(f.id)).toBe(typeBefore.get(f.id) === f.type);
    expect(after.fixtures.some((f) => !kept.has(f.id))).toBe(true);
    expect(sameFixtureIds(before, new Rig(before.fixtures)).size).toBe(before.fixtures.length);
  });
});
