// @vitest-environment jsdom
/**
 * QA of Symbol expansion through `importMvr`: cycles end with a warning and keep what came before, and a large scene
 * stays fast. The expansion rules themselves (depth, reuse, matrix order) are owned by `symbols.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { importMvr, type MvrImport } from '../../../../src/mvr/index.ts';
import { makeGlb, makeMvr, sceneXml } from '../../../shared/index.ts';

const GLB = makeGlb({
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  accessors: [{ min: [0, 0, 0], max: [1, 1, 1] }],
});
const mesh = '<Geometry3D fileName="box.glb"/>';
const symbol = (symdef: string): string => `<Symbol uuid="i-${symdef}" symdef="${symdef}"/>`;
const symdef = (uuid: string, children: string): string =>
  `<Symdef uuid="${uuid}"><ChildList>${children}</ChildList></Symdef>`;
const object = (uuid: string, geometries: string): string =>
  `<SceneObject uuid="${uuid}"><Geometries>${geometries}</Geometries></SceneObject>`;

/** Imports one layer of `objects`, with `symdefs` in AUXData and one readable `box.glb`. */
const importScene = (objects: string, symdefs: string): Promise<MvrImport> =>
  importMvr(
    makeMvr(sceneXml(`<Layer uuid="L1" name="L"><ChildList>${objects}</ChildList></Layer>`, symdefs), {
      'box.glb': GLB,
    }),
    { name: 'x' },
  );

const codes = (result: MvrImport): string[] => result.warnings.map((w) => w.code);

describe('importMvr symbol edges', () => {
  it('cuts a Symdef cycle A→B→A with one symbol-cycle warning and keeps the meshes before it', async () => {
    const symdefs = symdef('A', mesh + symbol('B')) + symdef('B', mesh + symbol('A'));
    const result = await importScene(object('S1', symbol('A')), symdefs);
    expect([result.summary.placementCount, codes(result)]).toEqual([2, ['symbol-cycle']]);
  });

  it('cuts a Symdef that holds a Symbol of itself, keeping its own mesh', async () => {
    const result = await importScene(object('S1', symbol('A')), symdef('A', mesh + symbol('A')));
    expect([result.summary.placementCount, codes(result)]).toEqual([1, ['symbol-cycle']]);
  });

  it('imports 10 000 symbol placements in under 2 s', async () => {
    const objects = Array.from({ length: 10_000 }, (_unused, i) => object(`S${i}`, symbol('A'))).join('');
    const start = performance.now();
    const result = await importScene(objects, symdef('A', mesh));
    const ms = performance.now() - start;
    expect([result.summary.placementCount, result.summary.objectCount]).toEqual([10_000, 10_000]);
    expect(ms).toBeLessThan(2000);
  });
});
