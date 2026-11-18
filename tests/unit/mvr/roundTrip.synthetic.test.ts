// @vitest-environment jsdom
/**
 * Acceptance (1) for a file from another tool: a third-party-style MVR (no luma data, its own GDTF, a missing GDTF,
 * a turned and an unpatched fixture, far from the stage origin) imported, exported and imported again keeps its
 * fixture count, ids, patches and fitted positions, because the export stores the fit offset it took off.
 */
import { describe, expect, it } from 'vitest';
import { exportMvr } from '../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../src/mvr/index.ts';
import { expectRigKept, gdtfMode, makeGdtf, makeMvr, sceneXml } from '../../shared/index.ts';

const BEAM = '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>';
const SPOT_MODE = gdtfMode('Std', [
  ['Dimmer', 'Offset="1"'],
  ['Pan', 'Offset="2"'],
]);

/** One `<Fixture>` with the fields a console writes; `address` is absolute, empty for an unpatched fixture. */
function fixture(id: string, spec: string, matrix: string, address: string): string {
  const addresses = address === '' ? '' : `<Addresses><Address break="0">${address}</Address></Addresses>`;
  return (
    `<Fixture uuid="U-${id}" name="Light ${id}"><Matrix>${matrix}</Matrix><GDTFSpec>${spec}</GDTFSpec>` +
    `<GDTFMode>Std</GDTFMode><FixtureID>${id}</FixtureID>${addresses}</Fixture>`
  );
}

const SCENE = sceneXml(
  `<Layer uuid="L1" name="Rig"><ChildList>
    ${fixture('101', 'Acme@Spot', '{1,0,0}{0,1,0}{0,0,1}{40000,25000,8000}', '513')}
    ${fixture('102', 'Acme@Spot', '{0,1,0}{-1,0,0}{0,0,1}{42000,25000,8000}', '')}
    ${fixture('7', 'Ghost@Wash', '{1,0,0}{0,0,-1}{0,1,0}{41000,21000,500}', '1030')}
  </ChildList></Layer>`,
);

const MVR = makeMvr(SCENE, { 'Acme@Spot.gdtf': makeGdtf({ geometries: BEAM, modes: SPOT_MODE }) });

describe('MVR round trip of a third-party file', () => {
  it('keeps fixture count, ids, patches and positions', async () => {
    const first = await importMvr(MVR, { name: 'Console.mvr' });
    const second = await importMvr(exportMvr(first.design).bytes, { name: 'Console.mvr' });
    expect(first.design.fixtures.map((f) => f.id)).toEqual([101, 102, 7]);
    expect(second.summary.fixtureCount).toBe(3);
    expectRigKept(first.design, second.design);
    expect(second.geometry.offset).toEqual(first.geometry.offset);
    expect(first.geometry.offset).not.toEqual([0, 0, 0]);
  });

  it('keeps the patch the file gave and auto-patches only the unpatched fixture', async () => {
    const first = await importMvr(MVR, { name: 'Console.mvr' });
    const second = await importMvr(exportMvr(first.design).bytes, { name: 'Console.mvr' });
    const patches = new Map(second.design.fixtures.map((f) => [f.id, f.patch]));
    expect(patches.get(101)).toEqual({ universe: 2, address: 1, mode: 'Std' });
    expect(patches.get(7)).toEqual({ universe: 3, address: 6, mode: 'Std' });
    expect(patches.get(102)).toMatchObject({ universe: 4, address: 1 });
  });
});
