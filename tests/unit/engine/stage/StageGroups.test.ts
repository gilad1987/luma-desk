/**
 * Owns how the group pool follows the stage: `StageGroups` swaps untouched defaults on a rig change, keeps user
 * groups, skips a show load but still moves its cache on, and `defaultPoolOf` gives the built-in design (by identity)
 * the old 37-slot pool. The merge rule on its own is owned by `regroup.test.ts`, the rules per stage by the domain.
 */
import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../src/core';
import { defaultGroupsOf } from '../../../../src/domain/stage/groupsOf';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { defaultGroups } from '../../../../src/engine/defaultGroups';
import type { EngineEvents } from '../../../../src/engine/events';
import { GroupLibrary, type GroupPool } from '../../../../src/engine/GroupLibrary';
import { defaultPoolOf } from '../../../../src/engine/stage/defaultPool';
import { StageGroups } from '../../../../src/engine/stage/StageGroups';
import { StageService } from '../../../../src/engine/stage/StageService';
import { recordEvents } from '../../../shared';

const builtIn = createTemplate('sultans-pool');
const festival = createTemplate('festival');
const defaultsOf = (d: StageDesign): GroupPool => defaultGroupsOf(rigFromDesign(d), d);
const user = { name: 'Mine', ids: [101, 102] };

const setup = () => {
  const bus = new EventBus<EngineEvents>();
  const service = new StageService(bus, { builtIn, tooManyFixtures: String });
  const groups = new GroupLibrary(bus);
  groups.replace(defaultGroups(service.rig));
  new StageGroups(bus, service, groups);
  const events = recordEvents(bus);
  return { service, groups, others: () => events.filter((e) => !e.startsWith('rigChanged')) };
};

describe('StageGroups', () => {
  it('swaps the defaults, adds truss groups from slot 38 and keeps user groups as the same object', () => {
    const { service, groups, others } = setup();
    groups.all[40] = user;
    service.apply(festival, 'builder');
    expect(groups.all).toStrictEqual({ ...defaultsOf(festival), 40: user });
    expect(groups.all[40]).toBe(user);
    const trussNames = festival.trusses.map((t) => t.name);
    const fromSlot38 = Object.entries(groups.all).filter(([slot]) => Number(slot) >= 38 && Number(slot) !== 40);
    expect(fromSlot38.length > 0 && fromSlot38.every(([, g]) => trussNames.includes(g.name))).toBe(true);
    expect(others()).toEqual(['poolsChanged', 'showChanged']);
  });

  it('keeps a user group over any number of changes, even one equal to a default it kept out', () => {
    const { service, groups } = setup();
    const mine = structuredClone(defaultsOf(festival)[38]);
    if (mine === undefined) throw new Error('festival has no truss group in slot 38');
    groups.all[38] = mine;
    service.apply(festival, 'builder');
    const theatre = createTemplate('theatre');
    service.apply(theatre, 'builder');
    expect(groups.all).toStrictEqual({ ...defaultsOf(theatre), 38: mine });
    expect(groups.all[38]).toBe(mine);
  });

  it('leaves the pool to the loader on a show load, then compares the next change with the loaded stage', () => {
    const { service, groups, others } = setup();
    const before = groups.all;
    service.apply(festival, 'showLoad');
    expect([groups.all === before, others()]).toEqual([true, []]);
    groups.replace({ ...defaultsOf(festival), 47: user });
    const empty = createTemplate('empty');
    service.apply(empty, 'builder');
    expect(groups.all).toStrictEqual({ ...defaultsOf(empty), 47: user });
  });

  it('gives back exactly the built-in pool when the built-in design returns', () => {
    const { service, groups } = setup();
    service.apply(festival, 'preview');
    service.apply(builtIn, 'builder');
    expect(JSON.stringify(groups.all)).toBe(JSON.stringify(defaultGroups(service.rig)));
  });
});

describe('defaultPoolOf', () => {
  it('gives the built-in design the 37-slot pool and an equal copy of it the truss groups too', () => {
    const bus = new EventBus<EngineEvents>();
    const service = new StageService(bus, { builtIn, tooManyFixtures: String });
    expect(JSON.stringify(defaultPoolOf(service))).toBe(JSON.stringify(defaultGroups(service.rig)));
    service.apply(structuredClone(builtIn), 'builder');
    expect(defaultPoolOf(service)).toStrictEqual(defaultGroupsOf(service.rig, builtIn));
    expect(Object.keys(defaultPoolOf(service)).length > 37).toBe(true);
  });
});
