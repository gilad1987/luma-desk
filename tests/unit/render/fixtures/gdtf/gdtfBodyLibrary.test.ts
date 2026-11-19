// @vitest-environment jsdom
/**
 * Owns the render side of the fixture body plan on a whole import: model files in any unit are fitted to the GDTF
 * model size, a body without a usable mesh gives the box its desk model is fitted to, a body that cannot be trusted
 * keeps the desk model, fixtures of one GDTF share one prototype, the model bytes leave the import, and `dispose`
 * frees every geometry. All products are invented.
 */
import { Box3, type BufferGeometry } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { importMvr } from '../../../../../src/mvr/index.ts';
import { GdtfBodyLibrary } from '../../../../../src/render/fixtures/gdtf/index.ts';
import { gdtfMode, make3ds, makeGdtf, makeGlb, makeMvr, sceneXml } from '../../../../shared/index.ts';

const MODES = gdtfMode('Std', [['Dimmer', 'Offset="1"']]);
const GEOMETRIES =
  '<Geometry Name="Body" Model="Body"><Beam Name="Beam" BeamType="Spot" BeamRadius="0.04"/></Geometry>';
const sized = (length: number): string =>
  `<Model Name="Body" Length="${length}" Width="0.2" Height="0.5" File="body"/>`;
/** Two triangles that span x by y by z of a Z-up file and hang below its origin, in the unit the caller picks. */
const span = (x: number, y: number, z: number): Uint8Array =>
  make3ds([
    [0, 0, 0],
    [x, 0, 0],
    [0, y, 0],
    [0, 0, 0],
    [0, 0, -z],
    [x, 0, 0],
  ]);
const posed = makeGlb({ scene: 0, scenes: [{ nodes: [0] }], nodes: [{ rotation: [0.258819, 0, 0, 0.965926] }] });
const gdtf = (name: string, models: string, files: Record<string, Uint8Array> = {}): Uint8Array =>
  makeGdtf({ name, models, geometries: GEOMETRIES, modes: MODES, files });
const FILES = {
  'Acme@Milli.gdtf': gdtf('Milli', sized(0.3), { 'models/3ds/body.3ds': span(300, 200, 500) }),
  'Acme@Metre.gdtf': gdtf('Metre', sized(0.3), { 'models/3ds/body.3ds': span(0.3, 0.2, 0.5) }),
  'Acme@Boxes.gdtf': gdtf('Boxes', sized(0.3)),
  'Custom@Posed.gdtf': gdtf('Posed', sized(0.3), { 'models/gltf/body.glb': posed }),
  'Acme@Huge.gdtf': gdtf('Huge', sized(1136), { 'models/3ds/body.3ds': span(1, 1, 1) }),
};
const SPECS = ['Acme@Milli', 'Acme@Metre', 'Acme@Boxes', 'Custom@Posed', 'Acme@Huge', 'Zenith@Gone', 'Acme@Milli'];
const fixture = (spec: string, index: number): string =>
  `<Fixture uuid="U-${index}" name="Light ${index}"><Matrix>{1,0,0}{0,1,0}{0,0,1}{${index * 1000},0,5000}</Matrix>` +
  `<GDTFSpec>${spec}</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>${index + 1}</FixtureID></Fixture>`;
const SCENE = sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${SPECS.map(fixture).join('')}</ChildList></Layer>`);
const read = () => importMvr(makeMvr(SCENE, FILES), { name: 'Bodies.mvr' });
const load = async (library = new GdtfBodyLibrary()): Promise<GdtfBodyLibrary> => {
  await library.load(await read());
  return library;
};
const boxOf = (geometry: BufferGeometry | undefined): number[] => {
  const box = new Box3();
  if (geometry) box.setFromBufferAttribute(geometry.getAttribute('position') as never);
  return [...box.min.toArray(), ...box.max.toArray()].map((value) => Math.round(value * 1e4) / 1e4 + 0);
};

const none = (values: readonly unknown[]): boolean => values.every((value) => value === undefined);

describe('GDTF body library on an import', () => {
  it('fits a millimetre and a metre mesh to one model size, shares a prototype and empties the import', async () => {
    const result = await read();
    const library = new GdtfBodyLibrary();
    await library.load(result);
    // Length on X, Height on Y (hanging below the origin), Width on Z: GDTF +Y is the app -Z
    expect(boxOf(library.protoOf('U-0')?.base)).toEqual([0, -0.5, -0.2, 0.3, 0, 0]);
    expect(boxOf(library.protoOf('U-1')?.base)).toEqual([0, -0.5, -0.2, 0.3, 0, 0]);
    expect(library.protoOf('U-0')).toBe(library.protoOf('U-6'));
    expect(result.gdtfMeshes.size).toBe(0);
  });

  it('follows the plan: meshes, the GDTF box for a body without a mesh, the desk model as it is for the rest', async () => {
    const library = await load();
    expect(library.stats).toEqual({ mesh: 3, shapes: 0, fitted: 1, desk: 3, multiHead: 0, failed: [] });
    expect(library.boxOf('U-2')).toEqual([0.3, 0.5, 0.2]);
    expect(none(['U-0', 'U-3', 'U-4', 'U-5'].map((uuid) => library.boxOf(uuid)))).toBe(true);
    expect(none(['U-2', 'U-3', 'U-4', 'U-5'].map((uuid) => library.protoOf(uuid)))).toBe(true);
  });

  it('fits the desk model to the GDTF box when a model file does not parse, and notes it for the summary', async () => {
    const library = await load(new GdtfBodyLibrary(() => Promise.reject(new Error('bad file'))));
    expect([library.stats.mesh, library.stats.fitted, library.stats.failed.length]).toEqual([0, 4, 2]);
    expect([library.protoOf('U-0'), library.boxOf('U-0')]).toEqual([undefined, [0.3, 0.5, 0.2]]);
    const notes = [...library.notes].map(([uuid, kinds]) => `${uuid} ${[...kinds.keys()].join()}`);
    expect(notes).toEqual(['U-0 unread', 'U-1 unread', 'U-6 unread']);
  });

  it('puts the lens of a static body on its beam origin and frees every geometry on dispose', async () => {
    const library = await load();
    const proto = library.protoOf('U-0');
    expect([proto?.moving, proto?.lensOff, proto?.lensRadius, proto?.aimAt.toArray()]).toEqual([
      false,
      0,
      0.04,
      [0, 0, 0],
    ]);
    const freed = vi.fn();
    proto?.base?.addEventListener('dispose', freed);
    library.lens.addEventListener('dispose', freed);
    library.dispose();
    expect(freed).toHaveBeenCalledTimes(2);
  });
});
