/**
 * The first look's light budget: light from many beams adds up on the deck and in the haze, so a big rig shares a
 * group budget instead of running every key beam at full (which turned a 248-fixture plot white).
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { Fixture } from '../../../src/domain/Fixture';
import { rigFromDesign } from '../../../src/domain/stage/deriveRig';
import { frameOf } from '../../../src/domain/stage/StageFrame';
import { createTemplate } from '../../../src/domain/stage/templates';
import { groupLevel, levelSteps, LOOK_BUDGET, MIN_SHARE } from '../../../src/show/mvrLook/lookLevels';
import { buildMvrFirstLook } from '../../../src/show/mvrLook/mvrFirstLook';

const COUNTS = [1, 10, 24, 25, 48, 72, 96, 97, 150, 248, 500];
const isKey = (f: Fixture): boolean => f.T.moving && ['spot', 'beam', 'profile'].includes(f.type);
/** The base level of `f` in the look: key 100, moving fill 40, static fill 15, none for blinders and strobes. */
const baseOf = (f: Fixture): number | undefined =>
  ['spot', 'beam', 'wash', 'par', 'bar', 'profile'].includes(f.type)
    ? [15, 40, 100][Number(f.T.moving) + Number(isKey(f))]
    : undefined;

describe('groupLevel', () => {
  it('runs a group of up to the budget at its base level, all lit', () => {
    for (const count of [1, 10, LOOK_BUDGET]) expect(groupLevel(100, count)).toEqual({ level: 100, lit: count });
  });

  it('keeps the lit sum of a group of 10 to 500 on the budget and each lit beam at the minimum share or more', () => {
    for (const count of COUNTS) {
      const { level, lit } = groupLevel(100, count);
      expect(level * lit, `count ${count}`).toBeLessThanOrEqual(LOOK_BUDGET * 100 + lit);
      expect(level, `count ${count}`).toBeGreaterThanOrEqual(MIN_SHARE * 100);
      expect(lit, `count ${count}`).toBeLessThanOrEqual(count);
    }
  });

  it('caps the lit count of a very big group at budget / minimum share', () => {
    expect(groupLevel(100, 500)).toEqual({ level: 25, lit: LOOK_BUDGET / MIN_SHARE });
  });
});

describe('levelSteps', () => {
  const row = Array.from({ length: 300 }, (_, i) => ({
    id: i + 1,
    pos: new Vector3(((i * 37) % 300) / 10 - 15, 8, 0),
  }));

  it('lights an even spread of a very big group across the width and puts the rest at 0', () => {
    const [on, off] = levelSteps(row, 100);
    expect([on?.[1], off?.[1]]).toEqual([{ dim: 25 }, { dim: 0 }]);
    expect([on?.[0].length, off?.[0].length]).toEqual([LOOK_BUDGET / MIN_SHARE, 300 - LOOK_BUDGET / MIN_SHARE]);
    const xs = row.filter((f) => on?.[0].includes(f.id)).map((f) => f.pos.x);
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([-14.9, 14.8]);
  });
});

/** Pinned levels by base level, so the test does not compute its expectation with the function under test. */
const PINNED = [
  ['theatre', { 100: 100, 40: 40, 15: 15 }],
  ['festival', { 100: 33, 40: 20, 15: 15 }],
] as const;

describe.each(PINNED)('the first look on the %s template', (id, levels) => {
  const design = createTemplate(id);
  const rig = rigFromDesign(design);
  const cue = buildMvrFirstLook({ rig, frame: frameOf(design) });
  const { fixtures } = rig;

  it('gives each group its pinned level: key spots and beams, moving washes and bars, static fill', () => {
    for (const f of fixtures) {
      const base = baseOf(f);
      const want = base === 100 || base === 40 || base === 15 ? levels[base] : undefined;
      expect(cue?.vals[f.id]?.dim, `fixture ${f.id} (${f.type})`).toBe(want);
    }
  });

  it('has the group sizes the pinned levels are for', () => {
    const sizes = [100, 40].map((base) => fixtures.filter((f) => baseOf(f) === base).length);
    if (id === 'festival') expect(sizes).toEqual([72, 48]);
    else expect(sizes.every((size) => size <= LOOK_BUDGET)).toBe(true);
  });

  it('keeps the summed key level within the budget, so the stage is not white-hot', () => {
    const sum = fixtures.filter(isKey).reduce((total, f) => total + (cue?.vals[f.id]?.dim ?? 0), 0);
    expect(sum).toBeLessThanOrEqual(LOOK_BUDGET * 100 + fixtures.length);
    expect(sum).toBeGreaterThan(0);
  });
});
