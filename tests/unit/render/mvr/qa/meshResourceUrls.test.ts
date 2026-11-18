// @vitest-environment jsdom
/**
 * QA of the URLs `OfflineLoadingManager` hands GLTFLoader, through importMvr and MvrStage.show. The bugs it guards:
 * an import key that render does not match (percent-encoded or case-different name), an embedded image that is
 * routed to the empty data URL, and a blob URL left alive when a parse throws or a stage is shown again.
 * `createImageBitmap` is stubbed because jsdom decodes no image; like a browser, it fails for an empty file.
 * The plain archive texture and buffer are owned by ../meshResources.test.ts; missing textures by meshFailures.
 */
import { MeshStandardMaterial } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { importMvr } from '../../../../../src/mvr/index.ts';
import { isMesh } from '../../../../../src/render/mvr/isMesh.ts';
import { MvrStage } from '../../../../../src/render/mvr/MvrStage.ts';
import { meshScene, triangleGlb, triangleGlbWithImage } from '../../../../shared/index.ts';

const IMAGE = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const BITMAP = { width: 1, height: 1, close: (): void => undefined };

/** Spies on blob URLs and console errors, then imports `files` with every `.glb` placed once. */
async function arrange(files: Record<string, Uint8Array>) {
  vi.stubGlobal('createImageBitmap', (blob: Blob) =>
    blob.size > 0 ? Promise.resolve(BITMAP) : Promise.reject(new Error('empty image')),
  );
  const spies = {
    errors: vi.spyOn(console, 'error').mockImplementation(() => undefined),
    created: vi.spyOn(URL, 'createObjectURL'),
    revoked: vi.spyOn(URL, 'revokeObjectURL'),
  };
  const placements = Object.keys(files)
    .filter((file) => file.endsWith('.glb'))
    .map((file) => ({ file }));
  return { spies, result: await importMvr(meshScene(placements, files), { name: 'urls' }) };
}

/** The drawn meshes whose material maps a texture. */
function texturedMeshes(stage: MvrStage): number {
  let count = 0;
  stage.group.traverse((node) => {
    if (isMesh(node) && node.material instanceof MeshStandardMaterial && node.material.map) count += 1;
  });
  return count;
}

/** Whether every blob URL made was revoked, and how many were made. */
function blobLedger({ created, revoked }: Awaited<ReturnType<typeof arrange>>['spies']): [number, boolean] {
  const gone = new Set(revoked.mock.calls.map(([url]) => url));
  const urls = created.mock.results.map((result) => String(result.value));
  return [urls.length, urls.every((url) => gone.has(url))];
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MvrStage.show of GLB resource URLs', () => {
  it('draws the archive texture of a percent-encoded and a case-different URI', async () => {
    const files = { 'a.glb': triangleGlb('my%20tex.png'), 'b.glb': triangleGlb('Wood.PNG') };
    const { spies, result } = await arrange({ ...files, 'my tex.png': IMAGE, 'wood.png': IMAGE });
    const stage = new MvrStage();
    const failures = await stage.show(result);
    expect([failures, texturedMeshes(stage), spies.errors.mock.calls]).toEqual([[], 2, []]);
  });

  it('draws images embedded by bufferView and data URI, and revokes the blob URL three made', async () => {
    const dataImage = `data:image/png;base64,${Buffer.from(IMAGE).toString('base64')}`;
    const { spies, result } = await arrange({ 'a.glb': triangleGlbWithImage(IMAGE), 'b.glb': triangleGlb(dataImage) });
    const stage = new MvrStage();
    const failures = await stage.show(result);
    expect([failures, texturedMeshes(stage), spies.errors.mock.calls, blobLedger(spies)]).toEqual([
      [],
      2,
      [],
      [1, true],
    ]);
  });

  it('revokes the texture blob URL when the parse fails for a missing external buffer', async () => {
    const { spies, result } = await arrange({ 'a.glb': triangleGlb('wood.png', 'tri.bin'), 'wood.png': IMAGE });
    const failures = await new MvrStage().show(result);
    expect([failures.map((failure) => failure.file), blobLedger(spies)]).toEqual([['a.glb'], [1, true]]);
  });

  it('revokes every blob URL when two meshes share a texture across two shows and a dispose', async () => {
    const files = { 'a.glb': triangleGlb('wood.png'), 'b.glb': triangleGlb('wood.png'), 'wood.png': IMAGE };
    const { spies, result } = await arrange(files);
    const stage = new MvrStage();
    await stage.show(result);
    const failures = await stage.show(result);
    stage.dispose();
    expect([failures, blobLedger(spies)]).toEqual([[], [4, true]]);
  });
});
