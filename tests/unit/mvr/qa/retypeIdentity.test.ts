// @vitest-environment jsdom
/**
 * A re-typed imported fixture no longer is the GDTF product the file named, so its export must drop the imported
 * GDTF name, mode and footprint; a fixture that keeps its type carries all three through every generation.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { FixtureTypeId } from '../../../../src/domain/FixtureType.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../../src/mvr/index.ts';
import { gdtfMode, makeGdtf, makeMvr, sceneXml } from '../../../shared/index.ts';

/** A 3-channel mode whose last channel sits at offset 5, so the footprint (5) differs from the channel count. */
const SPOT = makeGdtf({
  geometries: '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>',
  modes: gdtfMode('Std 16', [
    ['Dimmer', 'Offset="1"'],
    ['Pan', 'Offset="2"'],
    ['Tilt', 'Offset="5"'],
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

/** What an export wrote for fixture 101: its GDTF spec and mode, and whether its luma link holds a footprint. */
function written(bytes: Uint8Array): { spec?: string; mode?: string; linkFootprint: boolean } {
  const xml = strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array());
  const [, spec, mode] = /<GDTFSpec>([^<]*)<\/GDTFSpec><GDTFMode>([^<]*)</.exec(xml) ?? [];
  return {
    ...(spec === undefined ? {} : { spec }),
    ...(mode === undefined ? {} : { mode }),
    linkFootprint: xml.includes('&quot;footprint&quot;'),
  };
}

const facts = (design: StageDesign): unknown => {
  const info = design.mvr?.fixtures['101'];
  return { gdtfName: info?.gdtfName, gdtfMode: info?.gdtfMode, footprint: info?.footprint };
};

describe('MVR export of a re-typed imported fixture', () => {
  it('carries the GDTF name, mode and footprint over three generations while the type stays', async () => {
    const first = (await importMvr(FILE, { name: 'a.mvr' })).design;
    const second = (await importMvr(exportMvr(first).bytes, { name: 'b.mvr' })).design;
    const third = (await importMvr(exportMvr(second).bytes, { name: 'c.mvr' })).design;
    const want = { gdtfName: 'Acme@Spot', gdtfMode: 'Std 16', footprint: 5 };
    expect([facts(first), facts(second), facts(third)]).toEqual([want, want, want]);
    expect(written(exportMvr(third).bytes)).toEqual({ spec: 'Acme@Spot', mode: 'Std 16', linkFootprint: true });
  });

  it('drops the imported GDTF name, mode and footprint after the type changes', async () => {
    const first = (await importMvr(FILE, { name: 'a.mvr' })).design;
    const type: FixtureTypeId = first.fixtures[0]?.type === 'wash' ? 'par' : 'wash';
    const retyped = { ...first, fixtures: first.fixtures.map((fixture) => ({ ...fixture, type })) };
    const out = written(exportMvr(retyped).bytes);
    expect([out.spec === 'Acme@Spot', out.mode === 'Std 16', out.linkFootprint]).toEqual([false, false, false]);
    const again = (await importMvr(exportMvr(retyped).bytes, { name: 'b.mvr' })).design;
    expect(facts(again)).toEqual({ gdtfName: out.spec, gdtfMode: out.mode, footprint: undefined });
    expect(again.fixtures[0]?.type).toBe(type);
  });
});
