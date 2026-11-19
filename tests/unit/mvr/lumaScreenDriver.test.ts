// @vitest-environment jsdom
/** Review R2-2, LED walls: a wall comes back on its own driver fixture after a pass-through, a delete or a renumber. */
import { describe, expect, it } from 'vitest';
import type { StageDesign, StageScreen } from '../../../src/domain/stage/StageDesign.ts';
import { applyLumaData } from '../../../src/mvr/import/applyLumaData.ts';
import { linkOf, type LumaStageData } from '../../../src/mvr/luma/lumaData.ts';
import { exportMvr, importMvr } from '../../../src/mvr/index.ts';
import { fx, passFile, passUuid as u } from '../../../tests/shared/index.ts';

/** A `<Fixture>` whose `FixtureID` is empty, so the import numbers it and a pass-through keeps the empty text (D1). */
const noId = (n: number): string =>
  fx(u(n), n)
    .replace(/<FixtureID>\d+<\/FixtureID>/, '<FixtureID></FixtureID>')
    .replace(/IDNumeric>\d+</, 'IDNumeric>0<');

const original = passFile(noId(1) + noId(2) + noId(3));
const uuidOf = (design: StageDesign, id: number): string => design.mvr?.fixtures[String(id)]?.uuid ?? '';
const idOf = (design: StageDesign, uuid: string): number =>
  design.fixtures.find((f) => uuidOf(design, f.id) === uuid)?.id ?? expect.unreachable(`no fixture ${uuid}`);
const wall = (id: string, fixtureId: number, z: number): StageScreen => ({
  id,
  fixtureId,
  x0: -1,
  x1: 1,
  y0: 1,
  y1: 3,
  z,
});

/** The import with fixtures 2 and 3 as screens, wall A on fixture 2 and wall B on fixture 3. */
async function walled(): Promise<StageDesign> {
  const design = (await importMvr(original, { name: 'a.mvr' })).design;
  const screened = new Set([u(2), u(3)]);
  const fixtures = design.fixtures.map((f) =>
    screened.has(uuidOf(design, f.id)) ? { ...f, type: 'screen' as const } : f,
  );
  const screens = [wall('A', idOf(design, u(2)), -2), wall('B', idOf(design, u(3)), -3)];
  return { ...design, fixtures, screens };
}

/** Each wall with the uuid of its driver. */
const drivers = (design: StageDesign): Record<string, string> =>
  Object.fromEntries(design.screens.map((screen) => [screen.id, uuidOf(design, screen.fixtureId)]));

const roundTrip = async (design: StageDesign): Promise<StageDesign> =>
  (await importMvr(exportMvr(design, { original }).bytes, { name: 'b.mvr' })).design;

describe('LED walls pair with their driver by fixture uuid (R2-2)', () => {
  it('keeps each wall on its own driver after a delete and a pass-through export', async () => {
    const design = await walled();
    const back = await roundTrip({ ...design, fixtures: design.fixtures.filter((f) => f.id !== idOf(design, u(1))) });
    expect(back.fixtures).toHaveLength(2);
    expect(drivers(back)).toEqual({ A: u(2), B: u(3) });
  });

  it('keeps each wall on its own driver after a renumber and a pass-through export', async () => {
    const design = await walled();
    const mvr = design.mvr ?? expect.unreachable('an MVR import has MVR facts');
    const swap = (id: number): number => ({ 2: 3, 3: 2 })[id] ?? id;
    const infos = Object.entries(mvr.fixtures).map(([id, info]) => [String(swap(Number(id))), info] as const);
    const fixtures = design.fixtures.map((f) => ({ ...f, id: swap(f.id) }));
    const screens = design.screens.map((screen) => ({ ...screen, fixtureId: swap(screen.fixtureId) }));
    const renumbered = { ...design, fixtures, screens, mvr: { ...mvr, fixtures: Object.fromEntries(infos) } };
    expect(drivers(await roundTrip(renumbered))).toEqual({ A: u(2), B: u(3) });
  });

  it('keeps the wall ids of an older export, whose links have no uuid', async () => {
    const design = await walled();
    const { venue, scenery, deck, risers, trusses, screens } = design;
    const links = design.fixtures.map(linkOf);
    const luma: LumaStageData = { venue, scenery, deck, screens, risers, trusses, offset: [0, 0, 0], links };
    expect(applyLumaData(design, luma).design.screens).toEqual(screens);
  });

  it('drops a wall whose driver link pairs with no fixture, and does not move it to the fixture with that id', async () => {
    const design = await walled();
    const { venue, scenery, deck, risers, trusses, screens } = design;
    const links = design.fixtures.map((f) => ({ ...linkOf(f), uuid: f.id === idOf(design, u(3)) ? 'gone' : u(9) }));
    const luma: LumaStageData = { venue, scenery, deck, screens, risers, trusses, offset: [0, 0, 0], links };
    const applied = applyLumaData(design, luma);
    expect(applied.design.screens).toEqual([]);
    expect(applied.warnings.map((warning) => warning.ref)).toEqual(['A', 'B']);
  });
});
