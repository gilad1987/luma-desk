/** An invented static GDTF product with a base and a head file, hung `count` times, for the body tests. */
import { importMvr, type MvrImport } from '../../../../../src/mvr/index.ts';
import { gdtfMode, make3ds, makeGdtf, makeMvr, sceneXml } from '../../../../shared/index.ts';

/** `count` triangles, each `x` wide and hanging `z` below the origin, in millimetres. */
export const span = (x: number, z: number, count = 2): Uint8Array =>
  make3ds(
    Array.from({ length: count }, (_, i) => [
      [0, 0, -i / count],
      [x, 0, -i / count],
      [0, x, -z],
    ]).flat() as [number, number, number][],
  );
const MODELS =
  '<Model Name="Base" Length="0.4" Width="0.4" Height="0.1" File="base"/>' +
  '<Model Name="Head" Length="0.3" Width="0.3" Height="0.4" File="head"/>';
const TREE =
  '<Geometry Name="Base" Model="Base"><Axis Name="Head" Model="Head" Position="{1,0,0,0}{0,1,0,0}{0,0,1,-0.1}{0,0,0,1}">' +
  '<Beam Name="Beam" BeamType="Spot" BeamRadius="0.05"/></Axis></Geometry>';
const MODES = gdtfMode('Std', [['Dimmer', 'Offset="1"']], 'Base');
const fixture = (index: number): string =>
  `<Fixture uuid="U-${index}" name="Light ${index}"><Matrix>{1,0,0}{0,1,0}{0,0,1}{${index * 1000},0,5000}</Matrix>` +
  `<GDTFSpec>Acme@Spotto</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>${index + 1}</FixtureID></Fixture>`;

/** The import of `count` fixtures of the product whose head file is `head` (by archive path). */
export function spottoRig(head: Record<string, Uint8Array>, count = 1): Promise<MvrImport> {
  const files = { 'models/3ds/base.3ds': span(400, 100), ...head };
  const gdtf = makeGdtf({ name: 'Spotto', models: MODELS, geometries: TREE, modes: MODES, files });
  const rig = Array.from({ length: count }, (_, index) => fixture(index)).join('');
  const scene = sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${rig}</ChildList></Layer>`);
  return importMvr(makeMvr(scene, { 'Acme@Spotto.gdtf': gdtf }), { name: 'Spotto.mvr' });
}
