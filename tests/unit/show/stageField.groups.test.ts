/**
 * QA F1: a show loaded with a custom stage and no groups gets the default pool of that stage (`defaultPoolOf`, truss
 * groups included), the same pool `StageGroups` caches, so the next rig change leaves no stale default slot.
 */
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../src/domain/stage/templates';
import { defaultGroups } from '../../../src/engine/defaultGroups';
import { defaultPoolOf } from '../../../src/engine/stage/defaultPool';
import { StageGroups } from '../../../src/engine/stage/StageGroups';
import { jsonRoundTrip } from '../../shared';
import { stageWorld } from './stageWorld';

describe('show stage field: default groups of the loaded stage', () => {
  it('a show without groups gets the pool of its stage; a later rig change replaces all of it', () => {
    const world = stageWorld();
    new StageGroups(world.bus, world.service, world.groups);
    world.serializer.load({ v: 1, stage: jsonRoundTrip(createTemplate('theatre')) });
    expect(defaultPoolOf(world.service)).not.toEqual(defaultGroups(world.service.rig));
    expect(world.groups.all).toStrictEqual(defaultPoolOf(world.service));
    world.service.apply(createTemplate('empty'), 'builder');
    expect(world.groups.all).toStrictEqual({});
  });

  it('a show with the same custom stage swaps the pool without a rig change; the next change replaces its defaults', () => {
    const world = stageWorld();
    new StageGroups(world.bus, world.service, world.groups);
    world.service.apply(createTemplate('festival'), 'builder');
    world.serializer.load({ v: 1, stage: jsonRoundTrip(world.service.design) });
    expect(world.service.cause).toBe('builder');
    world.service.apply(createTemplate('empty'), 'builder');
    expect(world.groups.all).toStrictEqual({});
  });

  it('a show without stage on the built-in stage swaps the pool; the next change gives the new stage defaults', () => {
    const world = stageWorld();
    new StageGroups(world.bus, world.service, world.groups);
    world.service.apply(createTemplate('festival'), 'builder');
    world.service.apply(world.service.builtIn, 'builder');
    world.serializer.load({ v: 1 });
    world.service.apply(createTemplate('theatre'), 'builder');
    expect(world.groups.all).toStrictEqual(defaultPoolOf(world.service));
  });
});
