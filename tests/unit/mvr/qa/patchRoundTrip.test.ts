// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../../src/mvr/index.ts';
import { gdtfMode, makeGdtf, makeMvr, sceneXml } from '../../../shared/index.ts';

/** Raw `<Address>` text and the patch point it must import as, at the universe edges Messy_Patch-style files use. */
const ADDRESSES = [
  ['1', 1, 1],
  ['512', 1, 512],
  ['513', 2, 1],
  ['1024', 2, 512],
  ['7.300', 7, 300],
  ['32767', 64, 511],
  ['63999.512', 63_999, 512],
] as const;

/** Two fixtures 2 channels apart on a 4-channel mode: the second starts inside the first. */
const OVERLAP = [
  ['201', '3.10'],
  ['202', '3.12'],
] as const;

const PAR = makeGdtf({
  geometries: '<Geometry Name="Body"><Beam Name="Beam" BeamType="Wash" BeamAngle="30"/></Geometry>',
  modes: gdtfMode('Four', [
    ['Dimmer', 'Offset="1"'],
    ['ColorAdd_R', 'Offset="2"'],
    ['ColorAdd_G', 'Offset="3"'],
    ['ColorAdd_B', 'Offset="4"'],
  ]),
});

function fixture(id: string, address: string, index: number): string {
  return (
    `<Fixture uuid="00000000-0000-4000-8000-${id.padStart(12, '0')}" name="P${id}">` +
    `<Matrix>{1,0,0}{0,1,0}{0,0,1}{${index * 1000},0,5000}</Matrix><GDTFSpec>Acme@Par</GDTFSpec>` +
    `<GDTFMode>Four</GDTFMode><FixtureID>${id}</FixtureID>` +
    `<Addresses><Address break="0">${address}</Address></Addresses></Fixture>`
  );
}

const rows = [...ADDRESSES.map(([address], index) => [String(index + 1), address] as const), ...OVERLAP];
const FILE = makeMvr(
  sceneXml(
    '<Layer uuid="00000000-0000-4000-8000-000000000900" name="Patch"><ChildList>' +
      rows.map(([id, address], index) => fixture(id, address, index)).join('') +
      '</ChildList></Layer>',
  ),
  { 'Acme@Par.gdtf': PAR },
);

const patchOf = (fixtures: readonly { id: number; patch?: unknown }[], id: number): unknown =>
  fixtures.find((fixture) => fixture.id === id)?.patch;

describe('MVR patch edges through export and import', () => {
  it.each(ADDRESSES.map((row, index) => [index + 1, ...row] as const))(
    'imports fixture %i at "%s" as %i.%i and keeps it after a round trip',
    async (id, _text, universe, address) => {
      const first = await importMvr(FILE, { name: 'Patch.mvr' });
      const second = await importMvr(exportMvr(first.design).bytes, { name: 'Patch.mvr' });
      const expected = { universe, address, mode: 'Four' };
      expect(patchOf(first.design.fixtures, id)).toEqual(expected);
      expect(patchOf(second.design.fixtures, id)).toEqual(expected);
    },
  );

  it('keeps both overlapping patches and warns patch-overlap once, on the later fixture', async () => {
    const first = await importMvr(FILE, { name: 'Patch.mvr' });
    const exported = exportMvr(first.design);
    const overlaps = exported.summary.warnings.filter((warning) => warning.code === 'patch-overlap');
    expect(overlaps.map((warning) => warning.ref)).toEqual(['202']);
    const second = await importMvr(exported.bytes, { name: 'Patch.mvr' });
    expect(patchOf(second.design.fixtures, 201)).toEqual({ universe: 3, address: 10, mode: 'Four' });
    expect(patchOf(second.design.fixtures, 202)).toEqual({ universe: 3, address: 12, mode: 'Four' });
  });

  it('gives no patch-overlap warning for the fixtures that only touch at universe edges', () => {
    return importMvr(FILE, { name: 'Patch.mvr' }).then(({ design }) => {
      const refs = exportMvr(design).summary.warnings.map((warning) => warning.ref);
      expect(refs.filter((ref) => ADDRESSES.some((_row, index) => ref === String(index + 1)))).toEqual([]);
    });
  });
});
