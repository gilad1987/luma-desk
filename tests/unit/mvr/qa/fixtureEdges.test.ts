// @vitest-environment jsdom
/**
 * QA of odd fixture and layer data through `importMvr`: ids that clash or are zero, a missing Matrix, a nameless
 * layer and DMX addresses at the edges. The id and address rules are owned by `assignIds.test.ts` and
 * `address.test.ts`; this file checks that the whole import keeps them.
 */
import { describe, expect, it } from 'vitest';
import { importMvr, type MvrImport } from '../../../../src/mvr/index.ts';
import { makeMvr, sceneXml } from '../../../shared/index.ts';

interface FixtureXml {
  readonly uuid: string;
  readonly id?: string;
  readonly numeric?: string;
  readonly address?: string;
  readonly matrix?: string;
}

const fixture = ({ uuid, id = '', numeric, address, matrix }: FixtureXml): string =>
  `<Fixture uuid="${uuid}" name="${uuid}"><GDTFSpec>Robe Lighting@ParFect 150.gdtf</GDTFSpec>` +
  `<GDTFMode>Mode 1</GDTFMode><FixtureID>${id}</FixtureID>` +
  (numeric === undefined ? '' : `<FixtureIDNumeric>${numeric}</FixtureIDNumeric>`) +
  (matrix === undefined ? '' : `<Matrix>${matrix}</Matrix>`) +
  (address === undefined ? '' : `<Addresses><Address break="0">${address}</Address></Addresses>`) +
  '</Fixture>';

const importFixtures = (fixtures: readonly FixtureXml[], layer = 'name="Rig"'): Promise<MvrImport> =>
  importMvr(
    makeMvr(sceneXml(`<Layer uuid="L1" ${layer}><ChildList>${fixtures.map(fixture).join('')}</ChildList></Layer>`)),
    {
      name: 'x',
    },
  );

describe('importMvr fixture edges', () => {
  it('keeps the first of two equal FixtureIDs and gives the second a free id with a duplicate-id warning', async () => {
    const result = await importFixtures([
      { uuid: 'A', id: '7' },
      { uuid: 'B', id: '7' },
    ]);
    expect(result.design.fixtures.map((f) => f.id)).toEqual([7, 1]);
    const duplicates = result.warnings.filter((w) => w.code === 'duplicate-id');
    expect(duplicates.map((w) => w.ref)).toEqual(['B']);
  });

  // A FixtureIDNumeric of 0 is the MVR default for "not set", so it must not hide a valid FixtureID.
  it('treats FixtureIDNumeric 0 as no id and falls back to FixtureID', async () => {
    const result = await importFixtures([
      { uuid: 'A', id: '12', numeric: '0' },
      { uuid: 'B', numeric: '0' },
    ]);
    expect(result.design.fixtures.map((f) => f.id)).toEqual([12, 1]);
  });

  it('places a fixture without a Matrix at the file origin, with finite numbers', async () => {
    const result = await importFixtures([{ uuid: 'A' }, { uuid: 'B', matrix: '{1,0,0}{0,1,0}{0,0,1}{2000,0,0}' }]);
    const [a, b] = result.design.fixtures;
    expect([...(a?.position ?? []), ...(b?.position ?? [])].every(Number.isFinite)).toBe(true);
    expect((b?.position[0] ?? 0) - (a?.position[0] ?? 0)).toBeCloseTo(2, 6);
  });
});

describe('importMvr fixture edges: layers and addresses', () => {
  it('keeps a layer without a name attribute as an empty name', async () => {
    const result = await importFixtures([{ uuid: 'A' }], '');
    expect(result.design.mvr?.layers).toEqual([{ uuid: 'L1', name: '' }]);
  });

  it.each([
    ['1.512', { universe: 1, address: 512 }],
    ['513', { universe: 2, address: 1 }],
    [String(63999 * 512), { universe: 63999, address: 512 }],
  ])('patches address %s as %j', async (address, patch) => {
    const result = await importFixtures([{ uuid: 'A', address }]);
    const bad = result.warnings.filter((w) => w.code === 'bad-address');
    expect([result.design.fixtures[0]?.patch, bad]).toEqual([{ ...patch, mode: 'Mode 1' }, []]);
  });

  it.each([String(63999 * 512 + 1), '64000.1'])(
    'warns bad-address past sACN universe 63999 for %s',
    async (address) => {
      const result = await importFixtures([{ uuid: 'A', address }]);
      const bad = result.warnings.filter((w) => w.code === 'bad-address');
      expect([result.design.fixtures[0]?.patch, bad.length]).toEqual([undefined, 1]);
    },
  );

  it.each(['0', '512.0', '0.1', '-1', 'abc'])('leaves address %s unpatched', async (address) => {
    const result = await importFixtures([{ uuid: 'A', address }]);
    expect([result.design.fixtures[0]?.patch, result.summary.unpatchedCount]).toEqual([undefined, 1]);
  });
});
