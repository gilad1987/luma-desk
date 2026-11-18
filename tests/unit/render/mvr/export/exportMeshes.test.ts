// @vitest-environment jsdom
/**
 * An export with rendered meshes, read back by the import: every scene object finds its mesh file, no mesh is
 * missing or unreadable, and equal bodies (identical trusses, side screens) are written once and shared.
 */
import { describe, expect, it } from 'vitest';
import { createTemplate, TEMPLATE_IDS } from '../../../../../src/domain/stage/templates/index.ts';
import { meshShapes } from '../../../../../src/mvr/index.ts';
import { objectSpecs } from '../../../../../src/mvr/export/objectSpecs.ts';
import { exportRoundTrip } from '../../../../shared/index.ts';

const MESH_PROBLEMS = new Set(['missing-mesh', 'bad-mesh', 'no-geometry']);

describe.each(TEMPLATE_IDS)('exportMeshes of the %s template', (id) => {
  const design = createTemplate(id);

  it('writes one file per distinct body, under the names the scene uses', async () => {
    const { meshes } = await exportRoundTrip(design);
    expect([...meshes.keys()].sort()).toEqual([...meshShapes(design).keys()].sort());
    for (const bytes of meshes.values()) expect(new TextDecoder().decode(bytes.subarray(0, 4))).toBe('glTF');
  });

  it('comes back with a mesh for every object and no mesh warning', async () => {
    const { meshes, result } = await exportRoundTrip(design);
    expect(result.warnings.filter((warning) => MESH_PROBLEMS.has(warning.code))).toEqual([]);
    expect(result.geometry.placements).toHaveLength(objectSpecs(design).length);
    expect([...result.meshes.keys()].sort()).toEqual([...meshes.keys()].sort());
  });
});

describe('exportMeshes sharing', () => {
  it('writes equal bodies once, so the archive holds fewer files than objects', async () => {
    const design = createTemplate('festival');
    const { meshes, result } = await exportRoundTrip(design);
    expect(meshes.size).toBeLessThan(result.geometry.placements.length);
    expect(new Set(result.geometry.placements.map((placement) => placement.file)).size).toBe(meshes.size);
  });
});
