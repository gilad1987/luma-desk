/**
 * Owns the "All Beams" rule of `STANDARD_GROUPS` on a design with beams outside the old roles: the legacy beams keep
 * their old order, then every other beam follows once. The exact Sultan's Pool pool is owned by groups.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig.ts';
import { defaultGroupsOf } from '../../../../src/domain/stage/groupsOf.ts';
import type { StageDesign, StageFixture } from '../../../../src/domain/stage/StageDesign.ts';
import { STANDARD_GROUPS } from '../../../../src/domain/stage/standardGroups.ts';
import { sultansPool } from '../../../../src/domain/stage/templates/sultansPool/index.ts';

const ALL_BEAMS_SLOT = STANDARD_GROUPS.findIndex((rule) => rule.name === 'All Beams') + 1;

const allBeamsOf = (d: StageDesign): number[] => defaultGroupsOf(rigFromDesign(d), d)[ALL_BEAMS_SLOT]?.ids ?? [];

/** The built-in design plus a front beam, a side beam and a floor beam on a straight truss: no old rule finds them. */
function withExtraBeams(): { design: StageDesign; extras: number[] } {
  const design = sultansPool();
  const beam = design.fixtures.find((f) => f.type === 'beam');
  const straight = design.trusses.find((t) => t.params.kind === 'straight');
  if (beam === undefined || straight === undefined) throw new Error("Sultan's Pool has no beam or no straight truss");
  const next = Math.max(...design.fixtures.map((f) => f.id)) + 1;
  const extra: StageFixture[] = [
    { ...beam, id: next, role: 'front' },
    { ...beam, id: next + 1, role: 'side' },
    { ...beam, id: next + 2, role: 'floor', trussId: straight.id },
  ];
  return { design: { ...design, fixtures: [...design.fixtures, ...extra] }, extras: extra.map((f) => f.id) };
}

describe('STANDARD_GROUPS All Beams', () => {
  it('keeps the legacy order, then lists every other beam fixture exactly once', () => {
    const legacy = allBeamsOf(sultansPool());
    const { design, extras } = withExtraBeams();
    const ids = allBeamsOf(design);
    expect(ids).toStrictEqual([...legacy, ...extras]);
    const beams = rigFromDesign(design).fixtures.filter((f) => f.type === 'beam');
    expect([ids.length, new Set(ids).size]).toStrictEqual([beams.length, beams.length]);
  });
});
