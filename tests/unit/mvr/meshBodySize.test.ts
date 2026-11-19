// @vitest-environment jsdom
/**
 * Owns the one body size of an imported fixture: when the archive holds the GDTF meshes, the size stored for the desk
 * position (`mvr.fixtures[id].bodySize`) is the size measured on those meshes, the same one the drawn box takes; a
 * GDTF without mesh files keeps the size of its model boxes. The product is invented.
 */
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../src/mvr/index.ts';
import { gdtfMode, make3ds, makeGdtf, makeMvr, sceneXml } from '../../shared/index.ts';

const MODELS =
  '<Model Name="Base" Length="0.3" Width="0.3" Height="0.1"/>' +
  '<Model Name="Head" Length="0.2" Width="0.2" Height="0.6" File="head"/>';
/** The head hangs 0.1 m below the base plate. */
const GEOMETRIES =
  '<Geometry Name="Body" Model="Base">' +
  '<Geometry Name="Head" Model="Head" Position="{1,0,0,0}{0,1,0,0}{0,0,1,-0.1}{0,0,0,1}">' +
  '<Beam Name="Lens" BeamType="Wash" BeamAngle="20"/></Geometry></Geometry>';
/** The head mesh hangs below its origin: 200 x 200 mm, from 0 down to -600 mm. A box centred there is the guess. */
const HEAD_3DS = make3ds([
  [-100, -100, -600],
  [100, 100, 0],
]);
const FIXTURE =
  '<Fixture uuid="00000000-0000-4000-8000-000000000001" name="Head 1">' +
  '<Matrix>{1,0,0}{0,1,0}{0,0,1}{0,0,5000}</Matrix><GDTFSpec>Acme@Head</GDTFSpec><GDTFMode>Std</GDTFMode>' +
  '<FixtureID>1</FixtureID><Addresses><Address break="0">1</Address></Addresses></Fixture>';
const LAYER = `<Layer uuid="00000000-0000-4000-8000-000000000900" name="Rig"><ChildList>${FIXTURE}</ChildList></Layer>`;

/** The stored body size of the one fixture, for a GDTF with the given model files. */
async function storedSize(files: Readonly<Record<string, Uint8Array>>): Promise<number | undefined> {
  const modes = gdtfMode('Std', [['Dimmer', 'Offset="1"']]);
  const gdtf = makeGdtf({ models: MODELS, geometries: GEOMETRIES, modes, files });
  const { design } = await importMvr(makeMvr(sceneXml(LAYER), { 'Acme@Head.gdtf': gdtf }), { name: 'Size.mvr' });
  return Object.values(design.mvr?.fixtures ?? {})[0]?.bodySize;
}

describe('the body size of an imported fixture', () => {
  it('is the size measured on the GDTF meshes when the archive has them', async () => {
    // the base hangs from 0 to -0.1 m and the head mesh from -0.1 to -0.7 m
    expect(await storedSize({ 'models/3ds/head.3ds': HEAD_3DS })).toBeCloseTo(0.7, 6);
  });

  it('is the size of the model boxes for a GDTF without mesh files', async () => {
    // the head box is centred on its origin: -0.1 + 0.3 (cut at the base plate) down to -0.1 - 0.3
    expect(await storedSize({})).toBeCloseTo(0.4, 6);
  });
});
