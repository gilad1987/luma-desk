/**
 * The first look's light budget: light from many beams adds up on the deck and in the haze, so a big rig shares a
 * group budget instead of running every unit at its base level (which turned a 248-fixture plot white).
 */
import { describe, expect, it } from 'vitest';
import type { Fixture } from '../../../src/domain/Fixture';
import { groupLevel, levelSteps, LOOK_BUDGETS, type GroupBudget } from '../../../src/show/mvrLook/lookLevels';
import { mirrorGroups } from '../../../src/show/mvrLook/mirrorGroups';
import { fx, row } from './lookRig';

const { aerial } = LOOK_BUDGETS;
const COUNTS = [1, 6, 10, 24, 25, 34, 48, 100, 250, 500];
/** Exactly `lit` units at full. */
const only = (lit: number): GroupBudget => ({ base: 100, budget: lit, minShare: 1 });
const litOf = (fixtures: readonly Fixture[], spec: GroupBudget): Fixture[] => {
  const [on] = levelSteps(fixtures, spec, 0);
  return fixtures.filter((f) => on?.[0].includes(f.id));
};

describe('groupLevel', () => {
  it('runs a group of up to its budget at the base level, all lit', () => {
    for (const count of [1, 10, 24]) expect(groupLevel(aerial, count)).toEqual({ level: 100, lit: count });
  });

  it('lowers the level of a bigger group, then stops the lit count: 30 aerial shafts at 80', () => {
    expect([30, 100, 500].map((count) => groupLevel(aerial, count))).toEqual([
      { level: 80, lit: 30 },
      { level: 80, lit: 30 },
      { level: 80, lit: 30 },
    ]);
  });

  it('keeps the lit sum of every fixed group on its budget from 1 to 500 units', () => {
    for (const spec of Object.values(LOOK_BUDGETS).filter((budget) => !('all' in budget)))
      for (const count of COUNTS) {
        const { level, lit } = groupLevel(spec, count);
        expect(level * lit, `count ${count}`).toBeLessThanOrEqual(spec.base * spec.budget + lit);
        expect(lit).toBeLessThanOrEqual(count);
      }
  });

  it('lights every unit of an "all" group, never passes 100, and lights one unit at least', () => {
    expect(groupLevel({ base: 100, budget: 2, minShare: 0.1, all: true }, 50)).toEqual({ level: 10, lit: 50 });
    expect(groupLevel({ base: 115, budget: 9, minShare: 0.1 }, 3)).toEqual({ level: 100, lit: 3 });
    expect(groupLevel({ base: 100, budget: 0.04, minShare: 0.2 }, 8)).toEqual({ level: 20, lit: 1 });
  });
});

describe('levelSteps', () => {
  const beams = row(1, 'beam', 100, [9, 0]);

  it('lights 30 of 100 shafts at 80 and puts the others at 0; an empty group gives no step', () => {
    const [on, off] = levelSteps(beams, aerial, 0);
    expect([on?.[1], off?.[1]]).toEqual([{ dim: 80 }, { dim: 0 }]);
    expect([on?.[0].length, off?.[0].length]).toEqual([30, 70]);
    expect(levelSteps([], aerial, 0)).toEqual([]);
  });

  it('lights mirrored pairs, evenly from the ends to the centre line', () => {
    const lit = litOf(beams, aerial);
    for (const f of lit) expect(lit.some((m) => Math.abs(m.pos.x + f.pos.x) < 1e-9)).toBe(true);
    const reach = lit.map((f) => Math.abs(f.pos.x)).sort((a, b) => a - b);
    expect([(reach.at(0) ?? 9) < 0.3, (reach.at(-1) ?? 0) > 6.7]).toEqual([true, true]);
  });

  it('pairs by place with a tolerance, so a real plot whose two sides differ by centimetres still lights a mirrored pair', () => {
    const plot = [-11.72, -7.5, -3.9, 3.93, 7.46, 11.8].map((x, i) => fx(i + 1, 'beam', [x, 9, 0]));
    expect(litOf(plot, only(2)).map((f) => f.pos.x)).toEqual([-7.5, 7.46]);
  });

  it('pairs within a row when two rows share their places across the stage', () => {
    const lit = litOf([...row(1, 'beam', 4, [9, -3]), ...row(10, 'beam', 4, [9, 1])], only(4));
    expect(lit).toHaveLength(4);
    for (const f of lit) expect(lit.some((m) => m.pos.x === -f.pos.x && m.pos.z === f.pos.z)).toBe(true);
  });

  it('lights whole pairs: 2 of 5 is the middle pair, 3 of 5 the outer pair and the centre unit', () => {
    const five = row(1, 'beam', 5, [9, 0]);
    expect(litOf(five, only(2)).map((f) => f.id)).toEqual([2, 4]);
    expect(litOf(five, only(3)).map((f) => f.id)).toEqual([1, 3, 5]);
    expect(litOf(five, only(5))).toHaveLength(5);
  });

  it('still pairs by place when one side holds a unit more: a unit without a partner stands alone', () => {
    const rig = [...row(1, 'beam', 6, [9, 0]), fx(20, 'beam', [0, 9, 3]), fx(21, 'beam', [5, 9, 3])];
    expect(mirrorGroups(rig, 0).map((group) => group.map((f) => f.id))).toEqual([[1, 6], [21], [2, 5], [3, 4], [20]]);
    expect(litOf(rig, only(2)).map((f) => f.id)).toEqual([2, 5]);
    const uneven = [fx(1, 'beam', [-7, 9, 0]), fx(2, 'beam', [7.2, 6, 2]), fx(3, 'beam', [-3, 9, 0])];
    expect(mirrorGroups(uneven, 0).map((group) => group.map((f) => f.id))).toEqual([[1, 2], [3]]);
  });
});
