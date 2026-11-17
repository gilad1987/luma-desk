/**
 * Owns `defaultGroupsOf`: on the Sultan's Pool design, slots 1-37 must be the old `defaultGroups` pool (the oracle),
 * and the trusses that hold fixtures fill slots 38-48, which the old pool left empty.
 */
import { describe, expect, it } from 'vitest';
import { defaultGroups } from '../../../../src/engine/defaultGroups.ts';
import type { GroupPool } from '../../../../src/engine/GroupLibrary.ts';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig.ts';
import { defaultGroupsOf, GROUP_SLOTS } from '../../../../src/domain/stage/groupsOf.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import { sultansPool } from '../../../../src/domain/stage/templates/sultansPool/index.ts';

const design = sultansPool();
const rig = rigFromDesign(design);
const pool = defaultGroupsOf(rig, design);
const standard = Object.fromEntries(Object.entries(pool).filter(([slot]) => Number(slot) <= 37));

describe('defaultGroupsOf', () => {
  it('gives slots 1-37 of the old defaultGroups pool, with the same key order', () => {
    const old = defaultGroups(rig);
    expect(standard).toEqual(old);
    expect(Object.keys(standard)).toEqual(Object.keys(old));
    expect(Object.keys(old)).toHaveLength(37);
  });

  it('has the engine Group shape, so the engine can load the pool as it is', () => {
    const asEnginePool: GroupPool = pool;
    expect(Object.values(asEnginePool).every((g) => Object.keys(g).join() === 'name,ids')).toBe(true);
  });

  it('gives the first 11 trusses that hold fixtures slots 38-48, in truss order', () => {
    const trussSlots = Object.entries(pool).filter(([slot]) => Number(slot) > 37);
    expect(trussSlots.map(([slot]) => Number(slot))).toEqual([38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48]);
    expect(GROUP_SLOTS).toBe(48);
    const holding = design.trusses.filter((t) => design.fixtures.some((f) => f.trussId === t.id));
    expect(trussSlots.map(([, g]) => g.name)).toEqual(holding.slice(0, 11).map((t) => t.name));
  });

  it('lists the fixtures of a truss in build order', () => {
    const front = Object.values(pool).find((g) => g.name === design.trusses[0]?.name);
    const expected = design.fixtures.filter((f) => f.trussId === design.trusses[0]?.id).map((f) => f.id);
    expect(front?.ids).toEqual(expected);
    expect(front?.ids.slice(0, 2)).toEqual([101, 102]);
  });

  it('leaves out empty slots without shifting the others', () => {
    const noScreen = { ...design, fixtures: design.fixtures.filter((f) => f.type !== 'screen') };
    const groups = defaultGroupsOf(rigFromDesign(noScreen), noScreen);
    expect(groups[12]).toBeUndefined();
    expect(groups[13]?.name).toBe('All Beams');
  });

  it('gives an empty stage an empty pool', () => {
    const empty = createTemplate('empty');
    expect(defaultGroupsOf(rigFromDesign(empty), empty)).toEqual({});
  });
});
