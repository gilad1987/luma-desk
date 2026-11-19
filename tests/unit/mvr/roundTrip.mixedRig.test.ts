// @vitest-environment jsdom
/**
 * Owns the round trip of a mixed rig: a turned-over floor unit of another tool's file (its matrix is its body
 * orientation) beside a floor unit made on the desk (the desk floor pose, no rotation). Both are written with the same
 * turned-over matrix, so only the `ownRotation` flag of the luma link tells them apart; each must keep its own aim.
 */
import { describe, expect, it } from 'vitest';
import type { StageFixture } from '../../../src/domain/stage/StageDesign.ts';
import { exportMvr } from '../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../src/mvr/index.ts';
import { expectRigKept, gdtfMode, makeGdtf, makeMvr, sceneXml } from '../../shared/index.ts';

const HEAD = makeGdtf({
  geometries: '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>',
  modes: gdtfMode('Std', [
    ['Dimmer', 'Offset="1"'],
    ['Pan', 'Offset="2"'],
    ['Tilt', 'Offset="3"'],
  ]),
});
const FOREIGN =
  '<Fixture uuid="00000000-0000-4000-8000-000000000001" name="turned over">' +
  '<Matrix>{1,0,0}{0,-1,0}{0,0,-1}{0,0,0}</Matrix><GDTFSpec>Acme@Head</GDTFSpec><GDTFMode>Std</GDTFMode>' +
  '<FixtureID>1</FixtureID><Addresses><Address break="0">1</Address></Addresses></Fixture>';
const LAYER = `<Layer uuid="00000000-0000-4000-8000-000000000900" name="Rig"><ChildList>${FOREIGN}</ChildList></Layer>`;
const FILE = makeMvr(sceneXml(LAYER), { 'Acme@Head.gdtf': HEAD });

describe('MVR round trip of a rig with foreign and desk floor units', () => {
  it('keeps the rotation of the foreign unit and the floor pose of the desk unit', async () => {
    const first = (await importMvr(FILE, { name: 'Mixed.mvr' })).design;
    const foreign = first.fixtures[0];
    if (!foreign) throw new Error('the file has no fixture');
    expect([foreign.mount, foreign.rotation]).toEqual(['floor', [1, 0, 0, 0]]);
    const [x, y, z] = foreign.position;
    const desk: StageFixture = {
      id: 2,
      type: 'spot',
      role: 'floor',
      trussId: null,
      position: [x + 2, y, z],
      mount: 'floor',
    };
    const mixed = { ...first, fixtures: [foreign, desk] };
    const second = (await importMvr(exportMvr(mixed).bytes, { name: 'Mixed.mvr' })).design;
    expectRigKept(mixed, second);
    expect(second.fixtures.map((fixture) => fixture.rotation)).toEqual([[1, 0, 0, 0], undefined]);
    // a second generation keeps both again
    const third = (await importMvr(exportMvr(second).bytes, { name: 'Mixed.mvr' })).design;
    expect(third.fixtures.map((fixture) => fixture.rotation)).toEqual([[1, 0, 0, 0], undefined]);
  });
});
