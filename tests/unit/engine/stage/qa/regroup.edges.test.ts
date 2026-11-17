/**
 * QA4: regroup at its edges (empty pool, user groups in default slots, edited defaults, collisions, slots past 48).
 * The main swap rules are owned by `../regroup.test.ts`; how default pools are built is owned by the domain tests.
 */
import { describe, expect, it } from 'vitest';
import { defaultGroupsOf, GROUP_SLOTS } from '../../../../../src/domain/stage/groupsOf';
import { rigFromDesign } from '../../../../../src/domain/stage/deriveRig';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../../src/domain/stage/templates';
import type { GroupPool } from '../../../../../src/engine/GroupLibrary';
import { regroup } from '../../../../../src/engine/stage/regroup';

const defaultsOf = (design: StageDesign): GroupPool => defaultGroupsOf(rigFromDesign(design), design);
const sultans = defaultsOf(createTemplate('sultans-pool'));
const theatre = defaultsOf(createTemplate('theatre'));

/** The festival with every truss doubled (new ids and fixtures), so it has 18 trusses with fixtures. */
function doubledFestival(): StageDesign {
  const d = createTemplate('festival');
  const trusses = d.trusses.map((t) => ({ ...t, id: `${t.id}-b`, name: `${t.name} B` }));
  const onTruss = d.fixtures.filter((f) => f.trussId !== null);
  const copies = onTruss.map((f, i) => ({ ...f, id: 30000 + i, trussId: `${f.trussId ?? ''}-b` }));
  return { ...d, trusses: [...d.trusses, ...trusses], fixtures: [...d.fixtures, ...copies] };
}

describe('regroup edges (QA4)', () => {
  it('fills an empty pool with copies of the new defaults, and an empty stage gives an empty pool', () => {
    const next = regroup({}, sultans, theatre);
    expect(next).toStrictEqual(theatre);
    expect([next[1] === theatre[1], next[1]?.ids === theatre[1]?.ids]).toEqual([false, false]);
    expect(regroup(sultans, sultans, defaultsOf(createTemplate('empty')))).toStrictEqual({});
  });

  it('keeps a user group stored in a default slot, as the same object, over the new default', () => {
    const user = { name: 'Mine', ids: [1, 2, 3] };
    const next = regroup({ ...sultans, 1: user }, sultans, theatre);
    expect([next[1] === user, next[3]]).toEqual([true, theatre[3]]);
  });

  it('keeps an old default the user relabelled, re-stored or reordered', () => {
    const [one, three, five] = [sultans[1], sultans[3], sultans[5]];
    if (one === undefined || three === undefined || five === undefined) throw new Error('no default');
    const relabelled = { ...one, name: 'FOH' };
    const restored = { ...three, ids: three.ids.slice(1) };
    const reordered = { ...five, ids: [...five.ids].reverse() };
    const next = regroup({ ...sultans, 1: relabelled, 3: restored, 5: reordered }, sultans, theatre);
    expect([next[1] === relabelled, next[3] === restored, next[5] === reordered]).toEqual([true, true, true]);
  });

  it('never moves a new default whose slot a user group holds; that default is left out', () => {
    const user = { name: 'Mine', ids: [7] };
    const next = regroup({ 38: user }, {}, theatre);
    const names = Object.values(next).map((g) => g.name);
    expect([next[38] === user, names.includes('Front truss'), next[39]?.name]).toEqual([true, false, 'Pipe 1']);
  });

  it('keeps a user group past slot 48 and the default pool stops at slot 48', () => {
    const many = defaultsOf(doubledFestival());
    const slots = Object.keys(many).map(Number);
    const user = { name: 'Far', ids: [1] };
    const next = regroup({ 60: user }, sultans, many);
    expect([Math.max(...slots), slots.filter((s) => s >= 38).length]).toEqual([GROUP_SLOTS, 11]);
    expect([next[60] === user, Object.keys(next).length]).toEqual([true, slots.length + 1]);
  });
});
