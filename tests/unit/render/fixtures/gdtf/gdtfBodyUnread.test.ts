// @vitest-environment jsdom
/**
 * Owns the rule that a body is never drawn half: when a model file a drawn part needs is bad, missing or empty, the
 * whole body falls back to the desk model at the GDTF box and the file is reported. All products are invented.
 */
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../../../src/mvr/index.ts';
import { GdtfBodyLibrary } from '../../../../../src/render/fixtures/gdtf/index.ts';
import { gdtfMode, make3ds, makeGdtf, makeMvr, sceneXml } from '../../../../shared/index.ts';

const span = (x: number, z: number): Uint8Array =>
  make3ds([
    [0, 0, 0],
    [x, 0, 0],
    [0, x, 0],
    [0, 0, 0],
    [0, 0, -z],
    [x, 0, 0],
  ]);
const JUNK = new Uint8Array(4096).map((_, i) => (i * 37) & 255);
const MODELS =
  '<Model Name="Base" Length="0.4" Width="0.4" Height="0.1" File="base"/>' +
  '<Model Name="Head" Length="0.3" Width="0.3" Height="0.4" File="head"/>';
const TREE =
  '<Geometry Name="Base" Model="Base"><Axis Name="Head" Model="Head" Position="{1,0,0,0}{0,1,0,0}{0,0,1,-0.1}{0,0,0,1}">' +
  '<Beam Name="Beam" BeamType="Spot" BeamRadius="0.05"/></Axis></Geometry>';
const MODES = gdtfMode('Std', [['Dimmer', 'Offset="1"']], 'Base');
const read = async (head: Record<string, Uint8Array>) => {
  const files = { 'models/3ds/base.3ds': span(400, 100), ...head };
  const gdtf = makeGdtf({ name: 'Spotto', models: MODELS, geometries: TREE, modes: MODES, files });
  const fixture =
    '<Fixture uuid="U-0" name="Light 0"><Matrix>{1,0,0}{0,1,0}{0,0,1}{0,0,5000}</Matrix>' +
    '<GDTFSpec>Acme@Spotto</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>1</FixtureID></Fixture>';
  const scene = sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${fixture}</ChildList></Layer>`);
  return importMvr(makeMvr(scene, { 'Acme@Spotto.gdtf': gdtf }), { name: 'Half.mvr' });
};

describe('a GDTF body with a model file that cannot be drawn', () => {
  it.each([
    ['a garbage 3DS', { 'models/3ds/head.3ds': JUNK }],
    ['a garbage GLB', { 'models/gltf/head.glb': JUNK }],
    ['a zero-triangle 3DS', { 'models/3ds/head.3ds': make3ds([]) }],
  ])('falls back as a whole for %s and reports the file', async (_, head) => {
    const result = await read(head);
    expect(result.bodies.get('U-0')?.draw).toBe('gdtf');
    const library = new GdtfBodyLibrary();
    await library.load(result);
    expect(library.protoOf('U-0')).toBeUndefined();
    expect(library.boxOf('U-0')).toBeDefined();
    expect(library.stats.failed).toEqual([`Acme@Spotto.gdtf/${Object.keys(head)[0] ?? ''}`]);
    expect([...library.notes.values()].map((kinds) => [...kinds.keys()])).toEqual([['unread']]);
  });

  it('falls back as a whole when the bytes of a needed file are not in the import', async () => {
    const result = await read({ 'models/3ds/head.3ds': span(300, 400) });
    result.gdtfMeshes.delete('Acme@Spotto.gdtf/models/3ds/head.3ds');
    const library = new GdtfBodyLibrary();
    await library.load(result);
    expect([library.protoOf('U-0'), library.stats.failed]).toEqual([
      undefined,
      ['Acme@Spotto.gdtf/models/3ds/head.3ds'],
    ]);
  });

  it('draws the body when every needed file is good', async () => {
    const library = new GdtfBodyLibrary();
    await library.load(await read({ 'models/3ds/head.3ds': span(300, 400) }));
    expect([library.protoOf('U-0') !== undefined, library.stats.failed]).toEqual([true, []]);
  });
});
