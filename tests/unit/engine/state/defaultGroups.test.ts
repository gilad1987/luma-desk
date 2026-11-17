import { describe, expect, it } from 'vitest';
import { rng } from '../../../../src/core';
import { buildRig } from '../../../../src/domain/rig';
import { addNewDefaultGroups, defaultGroups, NEW_GROUPS } from '../../../../src/engine/defaultGroups';
import type { GroupPool } from '../../../../src/engine/GroupLibrary';
import demoShow from '../../../golden/demo-show.json';
import { defaultGroupsOracle } from './oracle/groupsOracle';
import { loadGroupsOracle } from './oracle/groupStoreOracle';

const rig = buildRig();
const json = (value: unknown): string => JSON.stringify(value);

describe('defaultGroups', () => {
  it('serialises exactly like the original defaultGroups, key order included', () => {
    expect(json(defaultGroups(rig))).toBe(json(defaultGroupsOracle(rig)));
  });

  it('matches the groups of the recorded demo show (tests/golden/demo-show.json)', () => {
    expect(json(defaultGroups(rig))).toBe(json(demoShow.groups));
  });

  it('puts the three newer groups at slots 35-37', () => {
    const groups = defaultGroups(rig);
    expect([35, 36, 37].map((slot) => groups[slot]?.name)).toEqual([...NEW_GROUPS]);
    expect(Object.keys(groups)).toHaveLength(37);
  });

  it('returns fresh id arrays on each call, so editing one show cannot change the defaults', () => {
    const a = defaultGroups(rig);
    const b = defaultGroups(rig);
    expect(a[1]?.ids).not.toBe(b[1]?.ids);
  });
});

/** A saved pool: some default slots, some custom groups, some slots 35-37 taken, some falsy entries. */
function randomSavedPool(random: () => number): GroupPool {
  const pool: GroupPool = {};
  const defaults = defaultGroups(rig);
  for (let slot = 1; slot <= 48; slot++) {
    const pick = random();
    if (pick < 0.3) continue;
    const base = defaults[slot];
    if (pick < 0.6 && base) pool[slot] = { name: base.name, ids: [...base.ids] };
    else pool[slot] = { name: `Custom ${slot}`, ids: [101 + slot] };
  }
  if (random() < 0.3) Object.assign(pool, { 36: null });
  return pool;
}

describe('addNewDefaultGroups', () => {
  it('matches the original loadShow migration over 300 random saved pools', () => {
    const random = rng(3);
    for (let run = 0; run < 300; run++) {
      const saved = randomSavedPool(random);
      const expected = loadGroupsOracle({ groups: structuredClone(saved) }, rig);
      expect(json(addNewDefaultGroups(structuredClone(saved), defaultGroups(rig)))).toBe(json(expected));
    }
  });

  it('never overwrites a slot the show uses and leaves the input pool unchanged', () => {
    const saved: GroupPool = { 35: { name: 'Mine', ids: [101] } };
    const upgraded = addNewDefaultGroups(saved, defaultGroups(rig));
    expect(upgraded[35]?.name).toBe('Mine');
    expect([upgraded[36]?.name, upgraded[37]?.name]).toEqual(['Follow Spots', 'Profiles']);
    expect(Object.keys(saved)).toEqual(['35']);
    expect(upgraded[1]).toBeUndefined();
  });
});
