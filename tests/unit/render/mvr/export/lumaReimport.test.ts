// @vitest-environment jsdom
/**
 * A desk export read back by the desk: the luma data rebuilds the stage, so the export's own `luma_*` meshes are not
 * drawn and give no surfaces a second time, while a mesh that another tool added to the file still is.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { surfacesOf } from '../../../../../src/domain/stage/surfaces.ts';
import { createTemplate } from '../../../../../src/domain/stage/templates/index.ts';
import { exportMvr, importMvr } from '../../../../../src/mvr/index.ts';
import { exportMeshes } from '../../../../../src/render/mvr/export/exportMeshes.ts';
import { make3ds, makeZip } from '../../../../shared/index.ts';

const SCENE = 'GeneralSceneDescription.xml';
const PROP_GEOMETRY = '<Geometries><Geometry3D fileName="prop.3ds"/></Geometries>';
const PROP = `<SceneObject uuid="P1" name="Prop"><Matrix>{1,0,0}{0,1,0}{0,0,1}{0,0,0}</Matrix>${PROP_GEOMETRY}</SceneObject>`;

/** The festival template exported with its meshes, optionally with a prop that another tool added. */
async function festivalExport(withProp: boolean): Promise<Uint8Array> {
  const design = createTemplate('festival');
  const { bytes } = exportMvr(design, { meshes: await exportMeshes(design) });
  if (!withProp) return bytes;
  const files = unzipSync(bytes);
  const xml = strFromU8(files[SCENE] ?? new Uint8Array()).replace(/<Layer [^>]*><ChildList>/, `$&${PROP}`);
  const prop = make3ds([
    [0, 0, 0],
    [1000, 1000, 500],
  ]);
  return makeZip({ ...files, [SCENE]: xml, 'prop.3ds': prop });
}

describe('re-import of a desk export', () => {
  it('rebuilds the stage from the luma data and draws none of its luma meshes', async () => {
    const { design, geometry, meshes, summary } = await importMvr(await festivalExport(false), { name: 'again' });
    expect(design.trusses.length).toBeGreaterThan(0);
    expect(surfacesOf(design).length).toBeGreaterThan(0);
    expect(geometry.placements).toEqual([]);
    expect(geometry.surfaces).toEqual([]);
    expect(meshes.size).toBe(0);
    expect(summary.placementCount).toBeGreaterThan(0);
  });

  it('still draws a mesh from another tool, and only that mesh gives surfaces', async () => {
    const { geometry, meshes } = await importMvr(await festivalExport(true), { name: 'again' });
    expect(geometry.placements.map((placement) => placement.file)).toEqual(['prop.3ds']);
    expect(geometry.surfaces).toHaveLength(1);
    expect([...meshes.keys()]).toEqual(['prop.3ds']);
  });
});
