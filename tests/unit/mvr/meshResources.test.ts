// @vitest-environment jsdom
/**
 * Owns `MvrImport.meshResources`: the image and buffer files that GLB meshes name by URI. The bugs it guards: a
 * texture or buffer the archive holds that never reaches render, and a missing one that is lost without a warning.
 */
import { describe, expect, it } from 'vitest';
import { importMvr, type MvrImport } from '../../../src/mvr/index.ts';
import { meshScene, TRIANGLE_BYTES, triangleGlb, type TestPlacement } from '../../shared/index.ts';

/** Any bytes stand in for an image: the import carries the file and never decodes it. */
const IMAGE = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

const imported = (placements: TestPlacement[], files: Record<string, Uint8Array>): Promise<MvrImport> =>
  importMvr(meshScene(placements, files), { name: 'resources' });

describe('importMvr meshResources', () => {
  it('carries the image and buffer a GLB names from the archive, keyed by the URI as the glTF writes it', async () => {
    const files = {
      'a.glb': triangleGlb('wood%20grain.png', 'tri.bin'),
      'wood grain.png': IMAGE,
      'tri.bin': TRIANGLE_BYTES,
    };
    const result = await imported([{ file: 'a.glb' }], files);
    expect([...result.meshResources].sort()).toEqual([
      ['tri.bin', TRIANGLE_BYTES],
      ['wood%20grain.png', IMAGE],
    ]);
    expect(result.warnings.filter((warning) => warning.code === 'missing-mesh-resource')).toEqual([]);
  });

  it('warns once per mesh file for each URI the archive lacks, and skips embedded data URIs', async () => {
    const files = { 'a.glb': triangleGlb('gone.png'), 'b.glb': triangleGlb('https://example.com/x.png') };
    const result = await imported([{ file: 'a.glb' }, { file: 'a.glb' }, { file: 'b.glb' }], files);
    const missing = result.warnings.filter((warning) => warning.code === 'missing-mesh-resource');
    expect(result.meshResources.size).toBe(0);
    expect(missing.map(({ ref, message }) => [ref, message])).toEqual([
      ['a.glb', 'The mesh file a.glb needs gone.png, which is not in the archive.'],
      ['b.glb', 'The mesh file b.glb needs https://example.com/x.png, which is not in the archive.'],
    ]);
  });
});
