// @vitest-environment jsdom
/**
 * QA of how `MvrImport.meshResources` turns the URI a GLB writes into an archive file name. The bugs it guards: a
 * texture lost because the writer changed the case of its name, an import that throws or drops a file on a stray
 * `%`, a `../` or folder URI that reaches a root file it does not name, and a warning for an image the GLB embeds.
 * The happy path and missing-file warnings are owned by meshResources.test.ts; drawing by the render tests.
 */
import { describe, expect, it } from 'vitest';
import { importMvr, type MvrImport } from '../../../../src/mvr/index.ts';
import { meshScene, triangleGlb, triangleGlbWithImage } from '../../../shared/index.ts';

/** Any bytes stand in for an image: the import carries the file and never decodes it. */
const IMAGE = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

/** Imports `files` with every `.glb` among them placed once. */
function imported(files: Record<string, Uint8Array>): Promise<MvrImport> {
  const placements = Object.keys(files)
    .filter((file) => file.endsWith('.glb'))
    .map((file) => ({ file }));
  return importMvr(meshScene(placements, files), { name: 'names' });
}

const missingRefs = (result: MvrImport): string[] =>
  result.warnings.filter((warning) => warning.code === 'missing-mesh-resource').map((warning) => warning.ref ?? '');

describe('importMvr meshResources names', () => {
  it('finds a file whose name differs only in case, keyed by the URI the GLB writes', async () => {
    const result = await imported({ 'a.glb': triangleGlb('Wood.PNG'), 'wood.png': IMAGE });
    expect([[...result.meshResources], missingRefs(result)]).toEqual([[['Wood.PNG', IMAGE]], []]);
  });

  it('reads a URI with a malformed percent escape as the file name it writes', async () => {
    const result = await imported({ 'a.glb': triangleGlb('100%.png'), '100%.png': IMAGE });
    expect([[...result.meshResources], missingRefs(result)]).toEqual([[['100%.png', IMAGE]], []]);
  });

  it('does not resolve a ../ or folder URI to the root file of that name, and warns for each', async () => {
    const files = { 'a.glb': triangleGlb('../x.png'), 'b.glb': triangleGlb('img/x.png'), 'x.png': IMAGE };
    const result = await imported(files);
    expect([result.meshResources.size, missingRefs(result)]).toEqual([0, ['a.glb', 'b.glb']]);
  });

  it('names no file and warns for none when the GLB embeds its image by data URI or bufferView', async () => {
    const dataImage = `data:image/png;base64,${Buffer.from(IMAGE).toString('base64')}`;
    const result = await imported({ 'a.glb': triangleGlb(dataImage), 'b.glb': triangleGlbWithImage(IMAGE) });
    expect([result.meshResources.size, missingRefs(result)]).toEqual([0, []]);
  });
});
