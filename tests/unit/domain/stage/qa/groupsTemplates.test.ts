/**
 * QA3: default and Auto Show groups on the rig of every template, not only Sultan's Pool. Catches a rule that names
 * an id the rig lacks, lists a fixture twice, or leaves a new template with no FOH or mover group. The exact Sultan's
 * Pool tables are owned by groups.test.ts and autoGroups.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { autoGroupsOf } from '../../../../../src/domain/stage/autoSlots.ts';
import { rigFromDesign } from '../../../../../src/domain/stage/deriveRig.ts';
import { defaultGroupsOf } from '../../../../../src/domain/stage/groupsOf.ts';
import { selectIds } from '../../../../../src/domain/stage/query.ts';
import { STANDARD_GROUPS } from '../../../../../src/domain/stage/standardGroups.ts';
import { createTemplate, TEMPLATE_IDS, type TemplateId } from '../../../../../src/domain/stage/templates/index.ts';

function groupsOf(id: TemplateId): { ids: Set<number>; groups: [string, number[]][] } {
  const design = createTemplate(id);
  const rig = rigFromDesign(design);
  const pool = Object.entries(defaultGroupsOf(rig, design)).map(([slot, g]): [string, number[]] => [slot, g.ids]);
  const auto = Object.entries(autoGroupsOf(rig, design));
  return { ids: new Set(rig.fixtures.map((f) => f.id)), groups: [...pool, ...auto] };
}

describe('QA3 groups on every template rig', () => {
  it.each(TEMPLATE_IDS)('gives %s groups of rig ids only, each id once per group', (id) => {
    const { ids, groups } = groupsOf(id);
    const missing = groups.filter(([, g]) => g.some((n) => !ids.has(n))).map(([name]) => name);
    const doubled = groups.filter(([, g]) => new Set(g).size !== g.length).map(([name]) => name);
    expect([missing, doubled]).toStrictEqual([[], []]);
  });

  it.each(TEMPLATE_IDS)('gives %s no empty default group', (id) => {
    const design = createTemplate(id);
    const pool = defaultGroupsOf(rigFromDesign(design), design);
    expect(Object.values(pool).filter((g) => g.ids.length === 0)).toStrictEqual([]);
  });

  it.each<TemplateId>(['theatre', 'festival'])('gives %s a FOH group of front fixtures and every mover', (id) => {
    const design = createTemplate(id);
    const rig = rigFromDesign(design);
    const pool = defaultGroupsOf(rig, design);
    const auto = autoGroupsOf(rig, design);
    const front = new Set(design.fixtures.filter((f) => f.role === 'front').map((f) => f.id));
    const movers = rig.fixtures.filter((f) => f.T.moving).map((f) => f.id);
    expect([
      (pool[1]?.ids.length ?? 0) > 0,
      pool[1]?.ids.every((n) => front.has(n)),
      auto.foh,
      pool[16]?.name,
      pool[16]?.ids,
      movers.length > 0,
    ]).toStrictEqual([true, true, pool[1]?.ids, 'All Movers', movers, true]);
  });

  it.each(TEMPLATE_IDS)('gives %s a distinct array for every Auto Show key', (id) => {
    const design = createTemplate(id);
    const arrays = Object.values(autoGroupsOf(rigFromDesign(design), design));
    expect(new Set(arrays).size).toBe(arrays.length);
  });
});

describe('QA3 selectIds with an empty design', () => {
  it('selects nothing for every standard query and does not throw', () => {
    const design = createTemplate('empty');
    const rig = rigFromDesign(design);
    const found = STANDARD_GROUPS.flatMap((r) => r.any).flatMap((q) => selectIds(rig, design, q));
    expect([rig.fixtures.length, found]).toStrictEqual([0, []]);
  });

  it('matches no role or truss for a rig fixture that the design does not list', () => {
    const theatre = createTemplate('theatre');
    const rig = rigFromDesign(theatre);
    const empty = createTemplate('empty');
    const byRole = selectIds(rig, empty, { role: 'front' });
    const byTruss = selectIds(rig, empty, { truss: 'none' });
    const byType = selectIds(rig, empty, { moving: true });
    expect([byRole, byTruss, byType.length > 0]).toStrictEqual([[], [], true]);
  });
});
