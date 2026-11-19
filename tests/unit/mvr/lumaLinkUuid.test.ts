// @vitest-environment jsdom
/** Review R2-2: a fixture's desk fields come back on the same fixture after a pass-through, a delete or a renumber. */
import { describe, expect, it } from 'vitest';
import type { StageDesign, StageFixture } from '../../../src/domain/stage/StageDesign.ts';
import type { LumaStageData } from '../../../src/mvr/luma/lumaData.ts';
import { applyLumaData } from '../../../src/mvr/import/applyLumaData.ts';
import { linkOf } from '../../../src/mvr/luma/lumaData.ts';
import { exportMvr, importMvr } from '../../../src/mvr/index.ts';
import { fx, passFile, passUuid as u } from '../../../tests/shared/index.ts';

/** A `<Fixture>` whose `FixtureID` is empty, so the import numbers it and a pass-through keeps the empty text (D1). */
const noId = (n: number): string =>
  fx(u(n), n)
    .replace(/<FixtureID>\d+<\/FixtureID>/, '<FixtureID></FixtureID>')
    .replace(/IDNumeric>\d+</, 'IDNumeric>0<');

const original = passFile(noId(1) + noId(2) + noId(3));
const ROLES = { [u(1)]: 'front', [u(2)]: 'mid', [u(3)]: 'back' } as const;

const uuidOf = (design: StageDesign, id: number): string => design.mvr?.fixtures[String(id)]?.uuid ?? '';

/** Each fixture by uuid with the role and mount it has. */
const byUuid = (design: StageDesign): Record<string, readonly [string, string]> =>
  Object.fromEntries(design.fixtures.map((f) => [uuidOf(design, f.id), [f.role, f.mount] as const]));

/** The imported design with a role per uuid and the second fixture on the floor, so each one has its own fields. */
async function marked(): Promise<StageDesign> {
  const design = (await importMvr(original, { name: 'a.mvr' })).design;
  const fixtures = design.fixtures.map((f): StageFixture => {
    const uuid = uuidOf(design, f.id);
    return { ...f, role: ROLES[uuid] ?? f.role, mount: uuid === u(2) ? 'floor' : f.mount };
  });
  return { ...design, fixtures };
}

const roundTrip = async (design: StageDesign): Promise<StageDesign> =>
  (await importMvr(exportMvr(design, { original }).bytes, { name: 'b.mvr' })).design;

describe('luma links pair by fixture uuid (R2-2)', () => {
  it('keeps each fixture its own fields after a delete and a pass-through export', async () => {
    const design = await marked();
    const before = byUuid(design);
    const first = design.fixtures.find((f) => uuidOf(design, f.id) === u(1))?.id;
    const deleted = { ...design, fixtures: design.fixtures.filter((f) => f.id !== first) };
    const back = await roundTrip(deleted);
    expect(back.fixtures).toHaveLength(2);
    expect(byUuid(back)).toEqual({ [u(2)]: before[u(2)], [u(3)]: before[u(3)] });
  });

  it('keeps each fixture its own fields after a renumber and a pass-through export', async () => {
    const design = await marked();
    const before = byUuid(design);
    const swapped = new Map([
      [1, 2],
      [2, 1],
    ]);
    const swap = (id: number): number => swapped.get(id) ?? id;
    const mvr = design.mvr ?? expect.unreachable('an MVR import has MVR facts');
    const infos = Object.entries(mvr.fixtures).map(([id, info]) => [String(swap(Number(id))), info] as const);
    const fixtures = design.fixtures.map((f) => ({ ...f, id: swap(f.id) }));
    const renumbered = { ...design, fixtures, mvr: { ...mvr, fixtures: Object.fromEntries(infos) } };
    expect(byUuid(await roundTrip(renumbered))).toEqual(before);
  });

  it('still pairs a link without a uuid (an older export) by the desk id', async () => {
    const design = await marked();
    const { venue, scenery, deck, risers, trusses } = design;
    const links = design.fixtures.map((f) => ({ ...linkOf(f), role: 'side' as const }));
    const luma: LumaStageData = { venue, scenery, deck, screens: [], risers, trusses, offset: [0, 0, 0], links };
    const applied = applyLumaData(design, luma).design;
    expect(applied.fixtures.map((f) => [f.id, f.role])).toEqual(design.fixtures.map((f) => [f.id, 'side']));
  });

  it('does not pair a link with a uuid by id when its fixture is gone', async () => {
    const design = await marked();
    const { venue, scenery, deck, risers, trusses } = design;
    const links = [{ ...linkOf(design.fixtures[0] as StageFixture), role: 'side' as const, uuid: 'gone' }];
    const luma: LumaStageData = { venue, scenery, deck, screens: [], risers, trusses, offset: [0, 0, 0], links };
    expect(applyLumaData(design, luma).design.fixtures.map((f) => f.role)).toEqual(design.fixtures.map((f) => f.role));
  });
});
