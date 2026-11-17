// @vitest-environment jsdom
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { importMvr, MvrError } from '../../../../src/mvr/index.ts';
import { gdtfMode, makeGdtf, makeMvr, makeZip, sceneXml } from '../../../shared/index.ts';

/** One patched fixture of `Acme@Par`, the smallest scene that reads a GDTF file. */
const SCENE = sceneXml(
  '<Layer uuid="00000000-0000-4000-8000-000000000001" name="Rig"><ChildList>' +
    '<Fixture uuid="00000000-0000-4000-8000-000000000002" name="P"><Matrix>{1,0,0}{0,1,0}{0,0,1}{0,0,5000}</Matrix>' +
    '<GDTFSpec>Acme@Par</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>7</FixtureID>' +
    '<Addresses><Address break="0">1</Address></Addresses></Fixture></ChildList></Layer>',
);

const PAR = makeGdtf({
  geometries: '<Geometry Name="Body"><Beam Name="Beam" BeamType="Wash" BeamAngle="30"/></Geometry>',
  modes: gdtfMode('Std', [['Dimmer', 'Offset="1"']]),
});

describe('importMvr NUL bytes in XML', () => {
  it('reads a scene that ends in "\\n\\0\\0" as console exports write it', async () => {
    const result = await importMvr(makeMvr(`${SCENE}\n\0\0`, { 'Acme@Par.gdtf': PAR }), { name: 'Nul.mvr' });
    expect(result.summary.fixtureCount).toBe(1);
    expect(result.summary.missingGdtfCount).toBe(0);
  });

  it('reads a GDTF description that ends in NUL bytes', async () => {
    const gdtf = makeZip({ 'description.xml': `${gdtfDescription()}\0\0\0` });
    const result = await importMvr(makeMvr(SCENE, { 'Acme@Par.gdtf': gdtf }), { name: 'Nul.mvr' });
    expect(result.warnings.map((warning) => warning.code)).not.toContain('bad-gdtf');
    expect(result.design.fixtures[0]?.patch).toEqual({ universe: 1, address: 1, mode: 'Std' });
  });

  it('rejects a NUL inside the scene with MvrError bad-xml', async () => {
    const broken = SCENE.replace('<Layers>', '<Layers>\0');
    await expect(importMvr(makeMvr(broken), { name: 'Nul.mvr' })).rejects.toSatisfy(
      (error) => error instanceof MvrError && error.code === 'bad-xml',
    );
  });
});

/** The description.xml inside {@link PAR}, so the NUL test changes only its tail. */
function gdtfDescription(): string {
  const entry = unzipSync(PAR)['description.xml'];
  return entry === undefined ? '' : strFromU8(entry);
}
