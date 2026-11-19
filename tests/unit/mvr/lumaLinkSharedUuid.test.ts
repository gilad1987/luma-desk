// @vitest-environment jsdom
/** Review R2-2: links of fixtures that share or lack a uuid pair by desk id, as the plain export keeps desk ids. */
import { describe, expect, it } from 'vitest';
import type { StageDesign, StageFixture, StageScreen } from '../../../src/domain/stage/StageDesign.ts';
import { FIXTURE_ROLES } from '../../../src/domain/stage/types.ts';
import { MvrArchive } from '../../../src/mvr/archive/MvrArchive.ts';
import { applyLumaData } from '../../../src/mvr/import/applyLumaData.ts';
import { linkOf, type LumaStageData } from '../../../src/mvr/luma/lumaData.ts';
import { exportMvr, importMvr } from '../../../src/mvr/index.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';
import { fx, passFile, passUuid as u } from '../../../tests/shared/index.ts';

const ROLES = ['front', 'mid', 'back'] as const;
const CASES: Readonly<Record<string, readonly string[]>> = {
  unique: [u(1), u(2), u(3)],
  blank: ['', '', ''],
  shared: [u(1), u(1), u(1)],
};

/** The import of fixtures with these uuids, numbered from 1, each with its own role (front, mid, back). */
async function rig(uuids: readonly string[]): Promise<StageDesign> {
  const file = passFile(uuids.map((uuid, i) => fx(uuid, i + 1)).join(''));
  const design = (await importMvr(file, { name: 'a.mvr' })).design;
  const fixtures = design.fixtures.map((f, i): StageFixture => ({ ...f, role: ROLES[i] ?? f.role }));
  return { ...design, fixtures };
}

/** The design without its first `count` fixtures, through a plain export and an import. */
async function deleteAndReturn(design: StageDesign, count = 1): Promise<StageDesign> {
  const kept = { ...design, fixtures: design.fixtures.slice(count) };
  return (await importMvr(exportMvr(kept).bytes, { name: 'b.mvr' })).design;
}

const roles = (design: StageDesign): (readonly [number, string])[] => design.fixtures.map((f) => [f.id, f.role]);
const wall = (id: string, fixtureId: number): StageScreen => ({ id, fixtureId, x0: -1, x1: 1, y0: 1, y1: 3, z: -2 });

describe('luma links of fixtures that share or lack a uuid (R2-2)', () => {
  it.each(Object.entries(CASES))('%s uuids: each fixture keeps its role after a delete', async (_, uuids) => {
    expect(roles(await deleteAndReturn(await rig(uuids)))).toEqual([
      [2, 'mid'],
      [3, 'back'],
    ]);
  });

  it('pairs a link by id when the delete left it the only one of its shared uuid', async () => {
    expect(roles(await deleteAndReturn(await rig(CASES['shared'] ?? []), 2))).toEqual([[3, 'back']]);
  });

  it.each(['blank', 'shared'])('%s uuids: keeps each LED wall on its own driver after a delete', async (name) => {
    const design = await rig(CASES[name] ?? []);
    const fixtures = design.fixtures.map((f) => (f.id === 1 ? f : { ...f, type: 'screen' as const }));
    const back = await deleteAndReturn({ ...design, fixtures, screens: [wall('A', 2), wall('B', 3)] });
    const roleOf = new Map(roles(back));
    expect(back.screens.map((screen) => [screen.id, roleOf.get(screen.fixtureId)])).toEqual([
      ['A', 'mid'],
      ['B', 'back'],
    ]);
  });

  it('pairs the blank-uuid links of an earlier export by id, whatever their occurrence', async () => {
    const design = await rig(['', '', '']);
    const { venue, scenery, deck, risers, trusses } = design;
    const role = (f: StageFixture): StageFixture['role'] => FIXTURE_ROLES[(f.id + 2) % FIXTURE_ROLES.length] ?? f.role;
    const links = design.fixtures.map((f) => ({ ...linkOf(f), role: role(f), uuid: '', occurrence: 3 - f.id }));
    const luma: LumaStageData = { venue, scenery, deck, screens: [], risers, trusses, offset: [0, 0, 0], links };
    const applied = applyLumaData(design, luma).design;
    expect(roles(applied)).toEqual(design.fixtures.map((f) => [f.id, role(f)]));
  });

  it('leaves the uuid out of the link of a fixture without one', async () => {
    const archive = MvrArchive.open(exportMvr(await rig(['', u(2)])).bytes);
    const data = parseXml(archive.text('GeneralSceneDescription.xml') ?? '').querySelector('UserData > Data');
    const { links } = JSON.parse(data?.textContent ?? '{}') as LumaStageData;
    expect(links.map((link) => link.uuid)).toEqual([undefined, u(2)]);
  });
});
