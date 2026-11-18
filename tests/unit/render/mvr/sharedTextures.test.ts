// @vitest-environment jsdom
/**
 * One import shares its archive textures across mesh files. The bugs it guards: a texture decoded once per file into
 * its own Texture, so equal textured materials never pool and every file is its own draw; and archive bytes or blob
 * URLs that the library keeps after the build. jsdom decodes no image, so `createImageBitmap` is stubbed.
 */
import { MeshStandardMaterial } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { importMvr } from '../../../../src/mvr/index.ts';
import { isMesh } from '../../../../src/render/mvr/isMesh.ts';
import { MeshLibrary } from '../../../../src/render/mvr/MeshLibrary.ts';
import { MvrStage } from '../../../../src/render/mvr/MvrStage.ts';
import { OfflineLoadingManager } from '../../../../src/render/mvr/OfflineLoadingManager.ts';
import { meshScene, triangleGlb } from '../../../shared/index.ts';

const IMAGE = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

/** Stubs `createImageBitmap` and returns the blobs it was asked to decode. */
function stubDecoder(): Blob[] {
  const blobs: Blob[] = [];
  vi.stubGlobal('createImageBitmap', (blob: Blob) => {
    blobs.push(blob);
    return Promise.resolve({ width: 1, height: 1, close: () => undefined });
  });
  return blobs;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MeshLibrary shared textures', () => {
  it('decodes a texture two files name once and draws both files with one pooled material', async () => {
    const blobs = stubDecoder();
    const files = { 'a.glb': triangleGlb('wood.png'), 'b.glb': triangleGlb('wood.png'), 'wood.png': IMAGE };
    const mvr = meshScene([{ file: 'a.glb' }, { file: 'b.glb' }], files);
    const { design, geometry, meshes, meshResources } = await importMvr(mvr, { name: 'shared' });
    const library = new MeshLibrary(meshes, meshResources);
    const [a, b] = await Promise.all([library.parts('a.glb'), library.parts('b.glb')]);
    const mapOf = (material: unknown) => (material instanceof MeshStandardMaterial ? material.map : undefined);
    expect(blobs.map((blob) => blob.size)).toEqual([IMAGE.byteLength]);
    expect(a?.[0]?.material).toBe(b?.[0]?.material);
    expect(mapOf(a?.[0]?.material)).toBeDefined();
    const stage = new MvrStage();
    await stage.show({ design, geometry, meshes, meshResources });
    let draws = 0;
    stage.group.traverse((node) => (draws += isMesh(node) ? 1 : 0));
    expect(draws).toBe(1);
  });

  it('holds no archive bytes or blob URL once every mesh file is parsed', async () => {
    stubDecoder();
    const created = vi.spyOn(URL, 'createObjectURL');
    const revoked = vi.spyOn(URL, 'revokeObjectURL');
    const released = vi.spyOn(OfflineLoadingManager.prototype, 'dispose');
    const library = new MeshLibrary(new Map([['a.glb', triangleGlb('wood.png')]]), new Map([['wood.png', IMAGE]]));
    await library.parts('a.glb');
    const managers = released.mock.contexts.filter((context) => context instanceof OfflineLoadingManager);
    expect(managers.map((manager) => manager.resolveURL('wood.png'))).toEqual(['data:,']);
    expect(revoked.mock.calls.map(([url]) => url)).toEqual(created.mock.results.map(({ value }) => String(value)));
  });
});
