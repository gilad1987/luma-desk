/**
 * Owns `selectIds` and `selectRule` on the Sultan's Pool design: each filter alone, `pick` after the filters, and
 * rule queries joined in order. A three-fixture design covers the edges: x = 0 and a truss id the design lacks.
 */
import { describe, expect, it } from 'vitest';
import { isLight } from '../../../../src/domain/rig/Rig.ts';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig.ts';
import { selectIds, selectRule } from '../../../../src/domain/stage/query.ts';
import type { StageDesign, StageFixture } from '../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
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
    expect(ids({ lights: true })).toEqual(rig.lightIds());
    expect(rig.fixtures.filter((f) => !isLight(f)).map((f) => f.id)).toEqual([2001]);
  });

  it('splits moving fixtures from fixed ones', () => {
    const moving = ids({ moving: true });
    const still = ids({ moving: false });
    expect(moving.length + still.length).toBe(rig.fixtures.length);
    expect(moving.every((id) => rig.get(id)?.T.moving)).toBe(true);
    expect(still).toContain(801);
  });
});

describe('selectIds on a small design', () => {
  const par = (id: number, x: number, trussId: string | null): StageFixture => ({
    id,
    type: 'par',
    role: 'floor',
    trussId,
    position: [x, 1, 0],
    mount: 'floor',
  });
  const small: StageDesign = {
    ...createTemplate('empty'),
    fixtures: [par(1, -1, null), par(2, 0, null), par(3, 1, 'gone')],
  };
  const smallRig = rigFromDesign(small);

  it('puts a fixture at x = 0 on neither side', () => {
    const [left, right] = [selectIds(smallRig, small, { side: 'left' }), selectIds(smallRig, small, { side: 'right' })];
    expect([left, right]).toStrictEqual([[1], [3]]);
  });

  it('matches no truss filter for a fixture whose truss id the design does not have', () => {
    expect(selectIds(smallRig, small, { truss: 'none' })).toStrictEqual([1, 2]);
    expect(selectIds(smallRig, small, { truss: 'straight' })).toStrictEqual([]);
  });
});

describe('selectRule', () => {
  it('joins the ids of its queries in query order', () => {
    const rule = { name: 'Test', any: [{ role: 'back' as const }, { role: 'mid' as const, type: 'beam' as const }] };
    expect(selectRule(rig, design, rule)).toEqual([...rig.range(501, 530), ...rig.range(201, 230)]);
  });
});
