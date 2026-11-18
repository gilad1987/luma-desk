// @vitest-environment jsdom
/**
 * Render half of `MvrImport.meshResources`: a GLB whose texture and buffer are archive files loads them through blob
 * URLs that are revoked after the parse. The bugs it guards: a texture three cannot load (and logs), a mesh that
 * fails for its external buffer, and blob URLs that leak. jsdom decodes no image, so `createImageBitmap` is stubbed.
 */
import { MeshStandardMaterial, Texture } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MeshLibrary } from '../../../../src/render/mvr/MeshLibrary.ts';
import { TRIANGLE_BYTES, triangleGlb } from '../../../shared/index.ts';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MeshLibrary with mesh resources', () => {
  it('loads an archive texture and buffer through blob URLs, revokes them, and logs no error', async () => {
    const decoded: unknown[] = [];
    vi.stubGlobal('createImageBitmap', (image: unknown) => {
      decoded.push(image);
      return Promise.resolve({ width: 1, height: 1, close: () => undefined });
    });
    const errors = vi.spyOn(console, 'error');
    const created = vi.spyOn(URL, 'createObjectURL');
    const revoked = vi.spyOn(URL, 'revokeObjectURL');
    const resources = new Map([
      ['wood.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
      ['tri.bin', TRIANGLE_BYTES],
    ]);
    const library = new MeshLibrary(new Map([['a.glb', triangleGlb('wood.png', 'tri.bin')]]), resources);
    const [part] = await library.parts('a.glb');
    const map = part?.material instanceof MeshStandardMaterial ? part.material.map : undefined;
    expect([library.failures(), part?.geometry.getAttribute('position').count]).toEqual([[], 3]);
    expect(map).toBeInstanceOf(Texture);
    expect(errors).not.toHaveBeenCalled();
    expect(decoded.map((image) => (image instanceof Blob ? image.size : image))).toEqual([4]);
    const urls = created.mock.results.map((result) => String(result.value));
    expect([urls.length, urls.every((url) => url.startsWith('blob:'))]).toEqual([2, true]);
    expect(revoked.mock.calls.map(([url]) => url).sort()).toEqual(urls.sort());
  });
});
