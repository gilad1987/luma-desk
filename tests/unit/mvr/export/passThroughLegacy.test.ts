// @vitest-environment jsdom
/** Second review, M-1 and M-3: an old show gains no fixture, and no patch-plan result is silent. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, passFile, passUuid as u } from '../../../shared/index.ts';

type Fixture = StageDesign['fixtures'][number];
const fixtureCount = (bytes: Uint8Array): number =>
  parseXml(strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array())).getElementsByTagName(
    'Fixture',
  ).length;
const load = async (original: Uint8Array): Promise<StageDesign> =>
  (await importMvr(original, { name: 'a.mvr' })).design;
const one = (n: number, uuid = u(n)): string =>
  fx(uuid, n, { at: `{1,0,0}{0,1,0}{0,0,1}{${n * 1000},0,6000}`, addresses: `<Address>${n * 100}</Address>` });
const unpatched = ({ patch: _patch, ...rest }: Fixture): Fixture => rest;
const firstOf = (design: StageDesign): Fixture => {
  const first = design.fixtures[0];
  if (!first) throw new Error('no fixture');
  return first;
};

/** The design as an app version before the import record saved it: no `imported` list and no `occurrence`. */
function legacy(design: StageDesign): StageDesign {
  if (!design.mvr) throw new Error('no MVR facts');
  const mvr = (({ imported: _imported, ...rest }: NonNullable<StageDesign['mvr']>) => rest)(design.mvr);
  const fixtures = Object.fromEntries(
    Object.entries(mvr.fixtures).map(([id, { occurrence: _occurrence, ...info }]) => [id, info]),
  );
  return { ...design, mvr: { ...mvr, fixtures } };
}

describe('pass-through of a show saved before the import record (M-1)', () => {
  it('adds and removes no fixture when the file repeats a uuid', async () => {
    const original = passFile(one(1, u(1)) + one(2, u(1)));
    const { bytes, summary } = exportMvr(legacy(await load(original)), { original });
    expect(fixtureCount(bytes)).toBe(2);
    expect(summary.changes).toMatchObject({ updated: 0, added: 0, removed: 0 });
  });

  it('keeps a fixture deleted on the desk and says why', async () => {
    const original = passFile(one(1) + one(2) + one(3));
    const design = legacy(await load(original));
    const fixtures = design.fixtures.filter((fixture) => fixture.id !== 3);
    const { bytes, summary } = exportMvr({ ...design, fixtures }, { original });
    expect(fixtureCount(bytes)).toBe(3);
    expect(summary.changes).toMatchObject({ added: 0, removed: 0 });
    expect(summary.report.losses.map((item) => item.text).join('\n')).toMatch(
      /^1 fixtures stay in the file because this show was saved before/m,
    );
  });

  it('pairs twins by their file id, so deleting the first leaves the others on their own elements (N5)', async () => {
    const original = passFile(one(1, u(1)) + one(2, u(1)) + one(3, u(1)));
    const design = legacy(await load(original));
    const fixtures = design.fixtures.filter((fixture) => fixture.id !== 1);
    const { bytes, summary } = exportMvr({ ...design, fixtures }, { original });
    expect(fixtureCount(bytes)).toBe(3);
    expect(summary.changes).toMatchObject({ updated: 0, moved: 0, added: 0, removed: 0 });
  });
});

describe('pass-through patch-plan notes (M-3)', () => {
  it('reports an added fixture with an invalid patch and a file fixture whose desk patch is out of range', async () => {
    const original = passFile(one(1));
    const design = await load(original);
    const first = firstOf(design);
    const fixtures = [
      { ...first, patch: { universe: 3, address: 600, mode: '' } },
      { ...first, id: 50, patch: { universe: 0, address: 1, mode: '' } },
    ];
    const { summary } = exportMvr({ ...design, fixtures }, { original });
    const losses = summary.report.losses.map((item) => item.text).join('\n');
    expect(losses).toMatch(/^1 fixtures had an invalid DMX patch and were written without an address\.$/m);
    expect(losses).toMatch(/^1 fixtures have an invalid DMX patch on the desk; the addresses of the file are kept/m);
  });

  it('reports an added fixture without a patch whose channel count the desk does not know', async () => {
    const original = passFile(one(1));
    const design = await load(original);
    const fixtures = [firstOf(design), { ...unpatched(firstOf(design)), id: 50 }];
    const { summary } = exportMvr({ ...design, fixtures }, { original });
    expect(summary.autoPatched).toBe(0);
    expect(summary.report.losses.map((item) => item.text).join('\n')).toMatch(
      /^1 added fixtures have no patch; the desk does not know their channel count/m,
    );
  });
});
