// @vitest-environment jsdom
/**
 * QA of MvrStage with bad or odd mesh files next to good ones: a corrupt GLB, a 3DS with an empty object or none, and
 * a GLB that names a texture the archive lacks. The bug each guards: one bad file that stops the others from drawing,
 * a failure reported for an empty but valid file, or a request to the app origin for a texture. jsdom loads no
 * images, so `createImageBitmap` is stubbed to fail as a browser does for the empty data URL. Parse errors of a single
 * file are owned by MeshLibrary.test.ts; archive textures by meshResources.test.ts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { importMvr } from '../../../../../src/mvr/index.ts';
import { isMesh } from '../../../../../src/render/mvr/isMesh.ts';
import { MvrStage } from '../../../../../src/render/mvr/MvrStage.ts';
import { make3ds, meshScene, triangleGlb } from '../../../../shared/index.ts';

const BOX = make3ds([
  [0, 0, 0],
  [100, 100, 100],
]);
const CORRUPT_GLB = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0, 7, 0, 0, 0]);
/** Shows `files`, each placed once at its own spot, and counts the drawn meshes and their vertices. */
async function shown(
  files: Record<string, Uint8Array>,
): Promise<{ failed: string[]; drawn: number; vertices: number }> {
  const placements = Object.keys(files).map((file, i) => ({ file, matrix: `{1,0,0}{0,1,0}{0,0,1}{${i * 1000},0,0}` }));
  const stage = new MvrStage();
  const failures = await stage.show(await importMvr(meshScene(placements, files), { name: 'odd' }));
  let drawn = 0;
  let vertices = 0;
  stage.group.traverseVisible((node) => {
    if (!isMesh(node)) return;
    drawn += 1;
    vertices += node.geometry.getAttribute('position').count;
  });
  return { failed: failures.map((failure) => failure.file), drawn, vertices };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MvrStage with odd mesh files', () => {
  it('names only the corrupt GLB and still draws both good files, merged into one mesh', async () => {
    expect(await shown({ 'a.3ds': BOX, 'bad.glb': CORRUPT_GLB, 'b.3ds': BOX })).toEqual({
      failed: ['bad.glb'],
      drawn: 1,
      vertices: 4,
    });
  });

  it('draws no vertex and reports no failure for a 3DS with an empty object or none', async () => {
    const { failed, vertices } = await shown({ 'empty.3ds': make3ds([]), 'none.3ds': make3ds() });
    expect([failed, vertices]).toEqual([[], 0]);
  });

  it('draws a GLB whose texture is not in the archive without asking the app origin for it', async () => {
    const realFetch = globalThis.fetch;
    const urls: string[] = [];
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
      urls.push(input instanceof Request ? input.url : String(input));
      return realFetch(input, init);
    });
    vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('jsdom: no image decoder')));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await shown({ 'wood.glb': triangleGlb('textures/wood.png') })).toEqual({
      failed: [],
      drawn: 1,
      vertices: 3,
    });
    expect(urls.filter((url) => !url.startsWith('data:'))).toEqual([]);
    // The import warns about the missing file once; the texture is skipped before three tries it, so nothing logs.
    expect(errors.mock.calls).toEqual([]);
  });
});
