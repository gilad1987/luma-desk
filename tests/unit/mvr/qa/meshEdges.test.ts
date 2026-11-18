// @vitest-environment jsdom
/**
 * QA of damaged mesh files through `importMvr`: each one must cost a `bad-mesh` warning, never a throw, a hang or a
 * non-finite number in the stage geometry. The reader branches are owned by `glbBounds.test.ts` and
 * `tdsBounds.test.ts`; this file checks what reaches the user.
 */
import { describe, expect, it } from 'vitest';
import { importMvr, type MvrImport } from '../../../../src/mvr/index.ts';
import { make3ds, makeGlb, makeMvr, sceneXml } from '../../../shared/index.ts';

/** Bytes from a fixed linear congruential sequence, so the "random" file is the same on every run. */
function noise(length: number, seed: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let state = seed;
  for (let i = 0; i < length; i++) {
    state = (state * 1103515245 + 12345) % 2147483648;
    bytes[i] = state & 0xff;
  }
  return bytes;
}

/** A one-node GLB whose POSITION accessor is `accessor`. */
const glbWith = (accessor: object): Uint8Array =>
  makeGlb({ nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], accessors: [accessor] });

const GOOD_GLB = glbWith({ count: 3, min: [0, 0, 0], max: [1, 1, 1] });

const FIXTURE = '<Fixture uuid="F1" name="F1"><GDTFSpec>Robe Lighting@FORTE.gdtf</GDTFSpec><GDTFMode/></Fixture>';

/** Imports one fixture and one SceneObject whose only mesh is `file`, stored with `bytes`. */
const importMesh = (file: string, bytes: Uint8Array): Promise<MvrImport> =>
  importMvr(
    makeMvr(
      sceneXml(`<Layer uuid="L1" name="L"><ChildList><SceneObject uuid="S1"><Geometries>
        <Geometry3D fileName="${file}"/></Geometries></SceneObject>${FIXTURE}</ChildList></Layer>`),
      { [file]: bytes },
    ),
    { name: 'x' },
  );

const meshCodes = (result: MvrImport): string[] =>
  result.warnings.filter((w) => w.code.endsWith('-mesh')).map((w) => `${w.code} ${w.ref ?? ''}`);

/** Every number inside `value`, depth first; the 3D view turns the fitted geometry numbers into positions. */
const numbersIn = (value: unknown): number[] => {
  if (typeof value === 'number') return [value];
  if (typeof value !== 'object' || value === null) return [];
  return Object.values(value).flatMap(numbersIn);
};

describe('importMvr damaged meshes', () => {
  it.each([
    ['noise.glb', noise(4096, 7)],
    ['noise.3ds', noise(4096, 11)],
    ['cut.glb', GOOD_GLB.slice(0, 30)],
    [
      'cut.3ds',
      make3ds([
        [0, 0, 0],
        [1, 1, 1],
      ]).slice(0, 20),
    ],
    ['empty.glb', new Uint8Array(0)],
  ])('warns bad-mesh for %s and still imports', async (file, bytes) => {
    const result = await importMesh(file, bytes);
    expect([meshCodes(result), result.summary.placementCount]).toEqual([[`bad-mesh ${file}`], 1]);
  });

  it.each([
    ['reads a GLB accessor with count 0 by its min/max', { count: 0, min: [0, 0, 0], max: [2, 1, 1] }, []],
    ['warns bad-mesh for a GLB accessor without min/max', { count: 3 }, ['bad-mesh a.glb']],
    [
      'warns bad-mesh for a GLB box that overflows to Infinity',
      { min: [0, 0, 0], max: [1e308, 1, 1] },
      ['bad-mesh a.glb'],
    ],
  ])('%s', async (_title, accessor, codes) => {
    expect(meshCodes(await importMesh('a.glb', glbWith(accessor)))).toEqual(codes);
  });
});

describe('importMvr mesh numbers', () => {
  // A NaN vertex once spread through `Aabb.union` into the fit offset, so every fixture x and z became NaN.
  it('keeps fixture positions and geometry finite when a 3DS vertex is NaN', async () => {
    const result = await importMesh(
      'nan.3ds',
      make3ds([
        [0, 0, 0],
        [NaN, 1000, 1000],
        [2000, 2000, 2000],
      ]),
    );
    const numbers = numbersIn([result.geometry, result.design.fixtures]);
    expect(numbers.filter((value) => !Number.isFinite(value))).toEqual([]);
  });
});
