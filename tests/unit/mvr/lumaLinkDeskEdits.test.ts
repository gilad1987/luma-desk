// @vitest-environment jsdom
/**
 * Review R2-2 with the desk's own edits: after `deleteFixtures` (which keeps the next fixture id mark) and an add,
 * a pass-through export and a re-import, each fixture and LED wall gets its own desk settings back.
 */
import { describe, expect, it } from 'vitest';
import { addFloorRow } from '../../../src/domain/stage/edit/addFixtures.ts';
import { deleteFixtures } from '../../../src/domain/stage/edit/itemOps.ts';
import type { StageDesign, StageFixture, StageScreen } from '../../../src/domain/stage/StageDesign.ts';
import { exportMvr, importMvr } from '../../../src/mvr/index.ts';
import { fx, passFile, passUuid as u } from '../../../tests/shared/index.ts';

/** A `<Fixture>` whose `FixtureID` is empty, so the import numbers it and a pass-through keeps the empty text (D1). */
const noId = (n: number): string =>
  fx(u(n), n)
    .replace(/<FixtureID>\d+<\/FixtureID>/, '<FixtureID></FixtureID>')
    .replace(/IDNumeric>\d+</, 'IDNumeric>0<');

const original = passFile(noId(1) + noId(2) + noId(3));
const FILE_UUIDS = new Set([u(1), u(2), u(3)]);
const ROLES = { [u(1)]: 'front', [u(2)]: 'mid', [u(3)]: 'back' } as const;

const uuidOf = (design: StageDesign, id: number): string => design.mvr?.fixtures[String(id)]?.uuid ?? '';
const idOf = (design: StageDesign, uuid: string): number =>
  design.fixtures.find((f) => uuidOf(design, f.id) === uuid)?.id ?? expect.unreachable(`no fixture ${uuid}`);

/** Each fixture's role and mount, by its file uuid, or as `added <id>` for a fixture the desk added. */
const settings = (design: StageDesign): Record<string, readonly [string, string]> =>
  Object.fromEntries(
    design.fixtures.map((f) => {
      const uuid = uuidOf(design, f.id);
      return [FILE_UUIDS.has(uuid) ? uuid : `added ${f.id}`, [f.role, f.mount] as const];
    }),
  );

/** The import with a role per uuid and the second fixture on the floor, so each one has its own settings. */
async function marked(): Promise<StageDesign> {
  const design = (await importMvr(original, { name: 'a.mvr' })).design;
  const fixtures = design.fixtures.map((f): StageFixture => {
    const uuid = uuidOf(design, f.id);
    return { ...f, role: ROLES[uuid] ?? f.role, mount: uuid === u(2) ? 'floor' : f.mount };
  });
  return { ...design, fixtures };
}

/** `design` with one floor par added by the desk, with the role `side`. */
function withAdded(design: StageDesign): StageDesign {
  const added = addFloorRow(design, { type: 'par', count: 1, from: [-2, 0, 4], to: [2, 0, 4] });
  const top = added.fixtures.at(-1)?.id;
  return { ...added, fixtures: added.fixtures.map((f) => (f.id === top ? { ...f, role: 'side' } : f)) };
}

const roundTrip = async (design: StageDesign): Promise<StageDesign> =>
  (await importMvr(exportMvr(design, { original }).bytes, { name: 'b.mvr' })).design;

const SPAN = { x0: -1, x1: 1, y0: 1, y1: 3 } as const;
const wall = (id: string, fixtureId: number, z: number): StageScreen => ({ ...SPAN, id, fixtureId, z });

describe('desk settings after a desk delete, an add and a pass-through round trip (R2-2)', () => {
  it('keeps each fixture its own settings after a delete, and no neighbour takes the deleted ones', async () => {
    const design = await marked();
    const before = settings(design);
    const back = await roundTrip(deleteFixtures(design, [idOf(design, u(2))]));
    expect(settings(back)).toEqual({ [u(1)]: before[u(1)], [u(3)]: before[u(3)] });
    expect(back.fixtures.filter((f) => f.role === 'mid' || f.mount === 'floor')).toEqual([]);
  });

  it('pairs an added fixture, whose link has no uuid, by the id the next-id mark gave it', async () => {
    const design = await marked();
    const before = settings(design);
    // add a fixture (101) and delete it: the mark keeps 101 used, so the next add gets the next block, 201
    const deleted = deleteFixtures(withAdded(design), [101]);
    expect(deleted.nextFixtureId).toBe(102);
    const added = withAdded(deleted);
    expect(added.fixtures.map((f) => f.id)).toEqual([1, 2, 3, 201]);
    const back = await roundTrip(added);
    expect(settings(back)).toEqual({ ...before, 'added 201': ['side', 'floor'] });
  });

  it('re-links each LED wall to its own driver after a delete and an add', async () => {
    const design = await marked();
    const screened = new Set([u(2), u(3)]);
    const fixtures = design.fixtures.map((f) =>
      screened.has(uuidOf(design, f.id)) ? { ...f, type: 'screen' as const } : f,
    );
    const screens = [wall('A', idOf(design, u(2)), -2), wall('B', idOf(design, u(3)), -3)];
    const edited = withAdded(deleteFixtures({ ...design, fixtures, screens }, [idOf(design, u(1))]));
    const back = await roundTrip(edited);
    expect(back.fixtures).toHaveLength(3);
    const drivers = Object.fromEntries(back.screens.map((s) => [s.id, uuidOf(back, s.fixtureId)]));
    expect(drivers).toEqual({ A: u(2), B: u(3) });
  });
});
