import { describe, expect, it } from 'vitest';
import { Rig } from '../../../src/domain/rig/Rig';
import { buildDemoShowFile } from '../../../src/show/demo/demoShowFile';
import { MVR_FIRST_LOOK_NAME } from '../../../src/show/mvrLook/mvrFirstLook';
import { isStartingShow } from '../../../src/show/startingShow/isStartingShow';
import { sameFixtureIds } from '../../../src/show/startingShow/sameFixtureIds';
import { importedSourceOf, startingShowWorld, type showWorld } from '../../shared';

const reload = (world: ReturnType<typeof showWorld>): void =>
  world.serializer.load(JSON.parse(world.json()) as unknown);

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
