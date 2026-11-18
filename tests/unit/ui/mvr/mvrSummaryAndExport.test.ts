// @vitest-environment jsdom
/**
 * Owns the import summary view model: counts with their `data-count` keys, offset, geometry line, and the warnings
 * of the import and of the mesh files three.js could not draw. The export flow is owned by exportMvrFile.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { importMvr, type MvrImport } from '../../../../src/mvr';
import { importSummaryView } from '../../../../src/ui/panels/mvr/importSummaryView';
import { makeGlb, makeMvr, sceneXml } from '../../../shared';

const GLB = makeGlb({
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  accessors: [{ min: [0, 0, 0], max: [1, 1, 1] }],
});
/** One fixture without its GDTF and without an address, so it counts as missing GDTF and unpatched. */
const FIXTURE = '<Fixture uuid="F1" name="F1"><GDTFSpec>Ghost@Wash</GDTFSpec><GDTFMode>Std</GDTFMode></Fixture>';
const TRUSS = '<Truss uuid="T1"><Geometries><Geometry3D fileName="truss.glb"/></Geometries></Truss>';

/** A real import of a one-fixture file, with a truss mesh when `withGeometry`. */
function imported(withGeometry: boolean): Promise<MvrImport> {
  const children = withGeometry ? FIXTURE + TRUSS : FIXTURE;
  const scene = sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${children}</ChildList></Layer>`);
  const bytes = makeMvr(scene, withGeometry ? { 'truss.glb': GLB } : {});
  return importMvr(bytes, { name: 'show.mvr' });
}

describe('importSummaryView', () => {
  it('lists the four counts under their e2e keys, the offset, the geometry line and the warnings', async () => {
    const result = await imported(true);
    const view = importSummaryView(result, []);
    expect(view.counts.map(({ key, value }) => [key, value])).toEqual([
      ['fixtures', 1],
      ['unpatched', 1],
      ['missingGdtf', 1],
      ['objects', 1],
    ]);
    const [x, y, z] = result.geometry.offset.map((value) => value.toFixed(2));
    expect(view.offset).toBe(`Offset x ${x} m, y ${y} m, z ${z} m`);
    expect(view.geometry).toBe('Stage built from MVR');
    expect(view.warnings).toEqual(result.warnings.map((warning) => warning.message));
    expect(view.bodies).toEqual(result.summary.bodyLines.map((line) => line.message));
    expect(view.warnings.some((text) => text.includes('Ghost@Wash'))).toBe(true);
  });

  it('says so when the file has no stage geometry', async () => {
    expect(importSummaryView(await imported(false), []).geometry).toBe('No stage geometry in file');
  });

  it('adds each mesh file three.js could not draw to the warnings, after the import warnings', async () => {
    const result = await imported(true);
    const view = importSummaryView(result, [{ file: 'truss.glb', reason: 'Unexpected end' }]);
    expect(view.warnings.slice(result.warnings.length)).toEqual([
      'Mesh file truss.glb could not be drawn: Unexpected end',
    ]);
  });
});
