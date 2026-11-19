/**
 * Owns the Auto Show coverage rule: every light of any stage is in at least one Auto Show group, so no fixture the
 * builder or an MVR import adds stays dark in every look, and where a light outside the legacy rules goes. That the
 * built-in groups equal the old `AG` ranges is owned by `autoGroups.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import type { FixtureTypeId } from '../../../../src/domain/FixtureType';
import { isLight } from '../../../../src/domain/rig/Rig';
import { autoGroupsOf } from '../../../../src/domain/stage/autoSlots';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import { addFixturesOnTruss, addFloorRow } from '../../../../src/domain/stage/edit/addFixtures';
import { addPresetTruss } from '../../../../src/domain/stage/edit/trussOps';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate, TEMPLATE_IDS } from '../../../../src/domain/stage/templates';
import { FIXTURE_ROLES, TRUSS_KINDS } from '../../../../src/domain/stage/types';

/** Every fixture type but `screen`, which is not a light (`isLight`). */
const TYPES: readonly FixtureTypeId[] = [
  'spot',
  'beam',
  'wash',
  'par',
  'blinder',
  'strobe',
  'bar',
  'follow',
  'profile',
];

/** The lights of `d` that no Auto Show group holds; screens are the separate `screen` group. */
function unplaced(d: StageDesign): number[] {
  const rig = rigFromDesign(d);
  const placed = new Set(Object.values(autoGroupsOf(rig, d)).flat());
  return rig.fixtures.filter((f) => isLight(f) && !placed.has(f.id)).map((f) => f.id);
}

/** Two fixtures of every type on one truss of every kind and on the floor, all with the role `role`. */
function everyPlace(role: (typeof FIXTURE_ROLES)[number]): StageDesign {
  const base = addPresetTruss(createTemplate('sultans-pool'), 'goalpost', [0, 0, -8]);
  let d: StageDesign = { ...createTemplate('empty'), trusses: base.trusses };
  for (const kind of TRUSS_KINDS) {
    const truss = d.trusses.find((t) => t.params.kind === kind);
    if (!truss) throw new Error(`no ${kind} truss`);
    for (const type of TYPES) d = addFixturesOnTruss(d, { trussId: truss.id, type, count: 2 });
  }
  for (const type of TYPES) d = addFloorRow(d, { type, count: 2, from: [-4, 0, 2], to: [4, 0, 2] });
  return { ...d, fixtures: d.fixtures.map((f) => ({ ...f, role })) };
}

describe('autoGroupsOf coverage', () => {
  it.each(TEMPLATE_IDS)('puts every light of the %s template in an Auto Show group', (id) => {
    expect(unplaced(createTemplate(id))).toEqual([]);
  });

  it.each(FIXTURE_ROLES)('puts every light with the role %s in an Auto Show group, on every truss kind', (role) => {
    const d = everyPlace(role);
    expect(d.fixtures).toHaveLength(TYPES.length * 2 * (TRUSS_KINDS.length + 1));
    expect(unplaced(d)).toEqual([]);
  });

  it('adds a light outside the legacy rules after the legacy ids: tower beams to towB, a front-truss beam to t2', () => {
    const festival = createTemplate('festival');
    const legacy = autoGroupsOf(rigFromDesign(festival), festival);
    let d = addPresetTruss(festival, 'tower', [-20, 0, -5]);
    const tower = d.trusses.at(-1)?.id ?? '';
    d = addFixturesOnTruss(d, { trussId: tower, type: 'beam', count: 2 });
    d = addFixturesOnTruss(d, { trussId: 'front', type: 'beam', count: 2 });
    d = addFixturesOnTruss(d, { trussId: 'back', type: 'spot', count: 2 });
    const added = d.fixtures.slice(festival.fixtures.length).map((f) => f.id);
    const groups = autoGroupsOf(rigFromDesign(d), d);
    expect(groups.towB).toEqual([...legacy.towB, ...added.slice(0, 2)]);
    expect(groups.t2).toEqual([...legacy.t2, ...added.slice(2, 4)]);
    expect(groups.t4).toEqual([...legacy.t4, ...added.slice(4, 6)]);
  });
});
