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

  it('finds a URI written with a leading ./ at the archive root, keyed as written', async () => {
    const files = { 'a.glb': triangleGlb('./wood.png'), 'wood.png': IMAGE };
    const result = await imported([{ file: 'a.glb' }], files);
    expect([...result.meshResources]).toEqual([['./wood.png', IMAGE]]);
    expect(result.warnings.filter((warning) => warning.code === 'missing-mesh-resource')).toEqual([]);
  });

  it('warns once per URI the archive lacks, with the count of mesh files that need it', async () => {
    const files = {
      'a.glb': triangleGlb('gone.png'),
      'b.glb': triangleGlb('https://example.com/x.png'),
      'c.glb': triangleGlb('gone.png'),
    };
    const placements = [{ file: 'a.glb' }, { file: 'a.glb' }, { file: 'b.glb' }, { file: 'c.glb' }];
    const result = await imported(placements, files);
    const missing = result.warnings.filter((warning) => warning.code === 'missing-mesh-resource');
    expect(result.meshResources.size).toBe(0);
    expect(missing.map(({ ref, message }) => [ref, message])).toEqual([
      ['gone.png', '2 mesh files need "gone.png", which is not in the MVR file.'],
      ['https://example.com/x.png', '1 mesh file needs "https://example.com/x.png", which is not in the MVR file.'],
    ]);
  });

  it('gives one line for 30 mesh files that need the same missing texture', async () => {
    const names = Array.from({ length: 30 }, (_, i) => `part-${i}.glb`);
    const files = Object.fromEntries(names.map((name) => [name, triangleGlb('stone.png')]));
    const result = await imported(
      names.map((file) => ({ file })),
      files,
    );
    const missing = result.warnings.filter((warning) => warning.code === 'missing-mesh-resource');
    expect(missing.map((warning) => warning.message)).toEqual([
      '30 mesh files need "stone.png", which is not in the MVR file.',
    ]);
  });
});
