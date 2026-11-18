// @vitest-environment jsdom
/**
 * The model files of a fixture's GDTF come out of the nested GDTF archive into the import result, under the byte
 * limits of the outer archive, and a GLB with a baked pose is found from its JSON alone. All products are invented.
 */
import { describe, expect, it } from 'vitest';
import { MvrArchive } from '../../../src/mvr/archive/MvrArchive.ts';
import { hasBakedPose } from '../../../src/mvr/gdtf/gdtfBakedPose.ts';
import { readGdtfEntries, type ByteBudget } from '../../../src/mvr/gdtf/gdtfEntries.ts';
import { gdtfMeshes } from '../../../src/mvr/import/gdtfMeshes.ts';
import { importMvr, MvrError } from '../../../src/mvr/index.ts';
import { gdtfMode, makeGdtf, makeGlb, makeMvr, sceneXml } from '../../shared/index.ts';

const glb = (node: object): Uint8Array => makeGlb({ scene: 0, scenes: [{ nodes: [0] }], nodes: [node] });
const GLB = glb({});
const GLB_PATH = 'models/gltf/body.glb';
const GDTF = makeGdtf({
  models:
    '<Model Name="Body" Length="0.3" Width="0.3" Height="0.5" File="body"/>' +
    '<Model Name="Spare" Length="0.1" Width="0.1" Height="0.1" File="spare"/>',
  geometries: '<Geometry Name="Body" Model="Body"><Beam Name="Beam" BeamType="Spot"/></Geometry>',
  modes: gdtfMode('Std', [
    ['Dimmer', 'Offset="1"'],
    ['Pan', 'Offset="2"'],
  ]),
  files: { [GLB_PATH]: GLB, 'models/3ds/body.3ds': 'twin', 'models/3ds/spare.3ds': 'not in the tree' },
});
const fixture = (id: number): string =>
  `<Fixture uuid="U-${id}" name="Light ${id}"><Matrix>{1,0,0}{0,1,0}{0,0,1}{${id * 1000},0,5000}</Matrix>` +
  `<GDTFSpec>Acme@Mover</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>${id}</FixtureID></Fixture>`;
const SCENE = sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${fixture(1)}${fixture(2)}</ChildList></Layer>`);
const MVR = makeMvr(SCENE, { 'Acme@Mover.gdtf': GDTF });

/** The error code of a nested read under `budget`, or `'none'` when it reads. */
function readCode(budget: ByteBudget): string {
  try {
    readGdtfEntries(GDTF, new Set([GLB_PATH]), budget);
    return 'none';
  } catch (error) {
    return error instanceof MvrError ? error.code : 'other';
  }
}

describe('GDTF model files in an import', () => {
  it('carries the files the geometry tree names, once per GDTF, the GLB and not its 3DS twin', async () => {
    const result = await importMvr(MVR, { name: 'Meshes.mvr' });
    expect([...result.gdtfMeshes.keys()]).toEqual([`Acme@Mover.gdtf/${GLB_PATH}`]);
    expect(result.gdtfMeshes.get(`Acme@Mover.gdtf/${GLB_PATH}`)).toEqual(GLB);
    expect(result.bodies.get('U-1')).toMatchObject({ bodyClass: 'mesh', gdtfFile: 'Acme@Mover.gdtf', flags: [] });
    expect(result.bodies.get('U-2')?.body).toBe(result.bodies.get('U-1')?.body);
  });

  it('puts the entry limit and the shared total limit on the nested archive', () => {
    expect(readCode({ entry: GLB.byteLength - 1, left: 10000 })).toBe('too-large');
    expect(readCode({ entry: 10000, left: GLB.byteLength - 1 })).toBe('too-large');
    const budget = { entry: 10000, left: 10000 };
    expect(readCode(budget)).toBe('none');
    expect(budget.left).toBe(10000 - GLB.byteLength);
  });

  it('keeps the import going when the model files of a GDTF are over the limit', () => {
    const uses = new Map([['Acme@Mover.gdtf', new Set([GLB_PATH])]]);
    const read = gdtfMeshes(MvrArchive.open(MVR), uses, { entry: 8, left: 10000 });
    expect(read.meshes.size).toBe(0);
    expect(read.warnings.map((warning) => [warning.code, warning.ref])).toEqual([['bad-gdtf', 'Acme@Mover.gdtf']]);
  });

  it('finds a baked pose: a GLB root node turned off the axes', () => {
    const quarter = Math.SQRT1_2;
    expect(hasBakedPose(GLB)).toBe(false);
    expect(hasBakedPose(glb({ rotation: [quarter, 0, 0, quarter] }))).toBe(false);
    expect(hasBakedPose(glb({ rotation: [0.258819, 0, 0, 0.965926] }))).toBe(true);
    expect(hasBakedPose(glb({ matrix: [1, 0, 0, 0, 0, 0.8, 0.6, 0, 0, -0.6, 0.8, 0, 0, 0, 0, 1] }))).toBe(true);
    expect(hasBakedPose(new TextEncoder().encode('not a GLB file at all'))).toBe(false);
  });
});
