/**
 * Owns the regroup decision on real template pools: untouched defaults swap, user groups stay as the same objects,
 * defaults keep their slot and are copied. Edge pools (empty, edited defaults, slots past 48) are in
 * `qa/regroup.edges.test.ts`; how a template's default pool is built is owned by the domain group tests.
 */
import { describe, expect, it } from 'vitest';
import { defaultGroupsOf } from '../../../../src/domain/stage/groupsOf';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import { createTemplate, type TemplateId } from '../../../../src/domain/stage/templates';
import type { GroupPool } from '../../../../src/engine/GroupLibrary';
import { regroup } from '../../../../src/engine/stage/regroup';

const defaultsOf = (id: TemplateId): GroupPool => {
  const design = createTemplate(id);
  return defaultGroupsOf(rigFromDesign(design), design);
};

describe('regroup', () => {
  it('swaps untouched defaults for the new stage defaults', () => {
    const before = defaultsOf('sultans-pool');
    const after = defaultsOf('festival');
    expect(regroup(structuredClone(before), before, after)).toEqual(after);
  });

  it('keeps user groups as the same objects, also in a slot of an old default', () => {
    const before = defaultsOf('sultans-pool');
    const user = { name: 'Mine', ids: [101, 102] };
    const relabeled = { name: 'Renamed', ids: [...(before[1]?.ids ?? [])] };
    const pool: GroupPool = { ...structuredClone(before), 1: relabeled, 47: user };
    const next = regroup(pool, before, defaultsOf('empty'));
    expect(next).toEqual({ 1: relabeled, 47: user });
    expect(next[1]).toBe(relabeled);
    expect(next[47]).toBe(user);
  });

  it('drops a default whose slot the new stage leaves empty', () => {
    const before = defaultsOf('sultans-pool');
    expect(regroup(structuredClone(before), before, {})).toEqual({});
  });

  it('puts truss groups into free slots from 38 and never over a user group', () => {
    const after = defaultsOf('festival');
    const trussSlots = Object.keys(after)
      .map(Number)
      .filter((slot) => slot >= 38);
    expect(trussSlots.length).toBeGreaterThan(1);
    expect(Math.max(...trussSlots)).toBeLessThanOrEqual(48);
    const user = { name: 'Mine', ids: [1] };
    const [taken] = trussSlots;
    if (taken === undefined) throw new Error('festival has no truss groups');
    const next = regroup({ [taken]: user }, defaultsOf('empty'), after);
    expect(next).toStrictEqual({ ...after, [taken]: user });
    expect(next[taken]).toBe(user);
  });

  it('copies new defaults, so a later Label cannot change the defaults kept for the next compare', () => {
    const after = defaultsOf('theatre');
    const next = regroup({}, {}, after);
    const [slot] = Object.keys(after).map(Number);
    if (slot === undefined) throw new Error('theatre has no default groups');
    expect(next[slot]).not.toBe(after[slot]);
    expect(next[slot]?.ids).not.toBe(after[slot]?.ids);
    expect(next[slot]).toEqual(after[slot]);
  });
});
