// @vitest-environment jsdom
/**
 * An export with rendered meshes, read as a console without luma data reads it: every scene object finds its mesh
 * file, no mesh is missing or unreadable, and equal bodies (identical trusses, side screens) are written once and
 * shared. The desk itself drops those meshes on import; `lumaReimport.test.ts` covers that.
 */
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { createTemplate, TEMPLATE_IDS } from '../../../../../src/domain/stage/templates/index.ts';
import { MvrArchive } from '../../../../../src/mvr/archive/MvrArchive.ts';
import { exportMvr, meshShapes, type MeshPlacement, type MvrWarning } from '../../../../../src/mvr/index.ts';
import { meshBounds } from '../../../../../src/mvr/mesh/meshBounds.ts';
import { objectSpecs } from '../../../../../src/mvr/export/objectSpecs.ts';
import { walkScene } from '../../../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../../../src/mvr/xml/parseXml.ts';
import { exportMeshes } from '../../../../../src/render/mvr/export/exportMeshes.ts';

const MESH_PROBLEMS = new Set(['missing-mesh', 'bad-mesh', 'no-geometry']);

/** What another console reads from the export: the mesh files, every placement and the mesh read warnings. */
interface ConsoleView {
  readonly meshes: ReadonlyMap<string, Uint8Array>;
  readonly placements: readonly MeshPlacement[];
  readonly warnings: readonly MvrWarning[];
}

async function consoleView(design: StageDesign): Promise<ConsoleView> {
  const meshes = await exportMeshes(design);
  const archive = MvrArchive.open(exportMvr(design, { meshes }).bytes);
  const { placements } = walkScene(parseXml(archive.text('GeneralSceneDescription.xml') ?? ''));
  const warnings: MvrWarning[] = [];
  for (const placement of placements) meshBounds(archive, placement.file, (warning) => warnings.push(warning));
  return { meshes, placements, warnings };
}

describe.each(TEMPLATE_IDS)('exportMeshes of the %s template', (id) => {
  const design = createTemplate(id);

  it('writes one file per distinct body, under the names the scene uses', async () => {
    const { meshes } = await consoleView(design);
    expect([...meshes.keys()].sort()).toEqual([...meshShapes(design).keys()].sort());
    for (const bytes of meshes.values()) expect(new TextDecoder().decode(bytes.subarray(0, 4))).toBe('glTF');
  });

  it('gives every object a readable mesh and no mesh warning', async () => {
    const { placements, warnings } = await consoleView(design);
    expect(warnings.filter((warning) => MESH_PROBLEMS.has(warning.code))).toEqual([]);
    expect(placements).toHaveLength(objectSpecs(design).length);
  });
});

describe('exportMeshes sharing', () => {
  it('writes equal bodies once, so the archive holds fewer files than objects', async () => {
    const design = createTemplate('festival');
    const { meshes, placements } = await consoleView(design);
    expect(meshes.size).toBeLessThan(placements.length);
    expect(new Set(placements.map((placement) => placement.file)).size).toBe(meshes.size);
  });
});
