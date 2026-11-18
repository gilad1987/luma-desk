// @vitest-environment jsdom
/**
 * Two generations of export and import. The first re-import restores the desk type from the luma data; when the
 * stored MVR facts still name the type guessed without a GDTF, the second export treats every fixture as re-typed
 * and writes the desk type's GDTF and mode, so the patch changes on a console.
 */
import { describe, expect, it } from 'vitest';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../../src/mvr/index.ts';
import type { MvrImport } from '../../../../src/mvr/MvrImport.ts';
import { expectRigKept, gdtfMode, makeGdtf, makeMvr, sceneXml } from '../../../shared/index.ts';

const SPOT = makeGdtf({
  geometries: '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>',
  modes: gdtfMode('Std 16', [
    ['Dimmer', 'Offset="1"'],
    ['Pan', 'Offset="2"'],
    ['Tilt', 'Offset="3"'],
  ]),
});

const FILE = makeMvr(
  sceneXml(
    '<Layer uuid="00000000-0000-4000-8000-000000000001" name="Rig"><ChildList>' +
      '<Fixture uuid="00000000-0000-4000-8000-000000000101" name="S"><Matrix>{1,0,0}{0,1,0}{0,0,1}{0,0,8000}</Matrix>' +
      '<GDTFSpec>Acme@Spot</GDTFSpec><GDTFMode>Std 16</GDTFMode><FixtureID>101</FixtureID>' +
      '<Addresses><Address break="0">513</Address></Addresses></Fixture></ChildList></Layer>',
  ),
  { 'Acme@Spot.gdtf': SPOT },
);

/** The GDTF facts and patch of fixture 101, as a later export reads them. */
const identityOf = ({ design }: MvrImport): unknown => {
  const info = design.mvr?.fixtures['101'];
  return { gdtfName: info?.gdtfName, gdtfMode: info?.gdtfMode, patch: design.fixtures[0]?.patch };
};

describe('MVR export of a re-imported desk export', () => {
  it('keeps the GDTF name, mode and patch over two generations', async () => {
    const first = await importMvr(FILE, { name: 'a.mvr' });
    const second = await importMvr(exportMvr(first.design).bytes, { name: 'b.mvr' });
    const third = await importMvr(exportMvr(second.design).bytes, { name: 'c.mvr' });
    const want = { gdtfName: 'Acme@Spot', gdtfMode: 'Std 16', patch: { universe: 2, address: 1, mode: 'Std 16' } };
    expect([identityOf(first), identityOf(second), identityOf(third)]).toEqual([want, want, want]);
    expectRigKept(second.design, third.design);
  });

  it('stores the type the fixture has after the luma data is restored', async () => {
    const first = await importMvr(FILE, { name: 'a.mvr' });
    const second = await importMvr(exportMvr(first.design).bytes, { name: 'b.mvr' });
    expect(second.design.mvr?.fixtures['101']?.type).toBe(second.design.fixtures[0]?.type);
  });
});
