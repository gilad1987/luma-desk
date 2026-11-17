/**
 * Owns `selectIds` and `selectRule` on the Sultan's Pool design: each filter alone, `pick` after the filters, and
 * rule queries joined in order.
 */
import { describe, expect, it } from 'vitest';
import { selectIds, selectRule } from '../../../../src/domain/stage/query.ts';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig.ts';
import { sultansPool } from '../../../../src/domain/stage/templates/sultansPool/index.ts';

const design = sultansPool();
const rig = rigFromDesign(design);
const ids = (q: Parameters<typeof selectIds>[2]): number[] => selectIds(rig, design, q);
const xOf = (id: number): number => rig.get(id)?.pos.x ?? Number.NaN;

describe('selectIds', () => {
  it('splits by side: left is x < 0, right is x > 0', () => {
    const left = ids({ role: 'mid', type: 'beam', side: 'left' });
    const right = ids({ role: 'mid', type: 'beam', side: 'right' });
    expect(left).toEqual(rig.range(201, 215));
    expect(right).toEqual(rig.range(216, 230));
    expect(left.every((id) => xOf(id) < 0) && right.every((id) => xOf(id) > 0)).toBe(true);
  });

  it('picks odd and even indexes after the filter', () => {
    expect(ids({ role: 'floor', type: 'beam', truss: 'none', pick: 'odd' }).slice(0, 3)).toEqual([701, 703, 705]);
    expect(ids({ role: 'floor', type: 'beam', truss: 'none', pick: 'even' }).slice(0, 3)).toEqual([702, 704, 706]);
  });

  it("keeps only fixtures on no truss for truss 'none', and those on a kind for a truss kind", () => {
    expect(ids({ role: 'floor', type: 'beam', truss: 'none' })).toEqual(rig.range(701, 799));
    expect(ids({ role: 'floor', type: 'beam', truss: 'tower' })).toEqual(rig.range(1601, 1699));
    expect(ids({ truss: 'none' }).every((id) => design.fixtures.find((f) => f.id === id)?.trussId === null)).toBe(true);
  });

  it('gives every light except the LED screen for lights', () => {
    expect(ids({ lights: true })).toEqual(rig.fixtures.filter((f) => f.id !== 2001).map((f) => f.id));
    expect(ids({ lights: true })).not.toContain(2001);
  });

  it('splits moving fixtures from fixed ones', () => {
    const moving = ids({ moving: true });
    const still = ids({ moving: false });
    expect(moving.length + still.length).toBe(rig.fixtures.length);
    expect(moving.every((id) => rig.get(id)?.T.moving)).toBe(true);
    expect(still).toContain(801);
  });
});

describe('selectRule', () => {
  it('joins the ids of its queries in query order', () => {
    const rule = { name: 'Test', any: [{ role: 'back' as const }, { role: 'mid' as const, type: 'beam' as const }] };
    expect(selectRule(rig, design, rule)).toEqual([...rig.range(501, 530), ...rig.range(201, 230)]);
  });
});
