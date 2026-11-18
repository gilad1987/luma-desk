// @vitest-environment jsdom
/**
 * Archive images decode as GLTFLoader decodes the images a file embeds, once per archive file. The bugs it guards: a
 * copy of GLTFLoader's browser rule that drifts from the parser's own pick; `wood.png` and `./wood.png` decoded twice;
 * a failed decode without `onError` left as an unhandled rejection. jsdom decodes no image, so decoders are stubbed.
 */
import { ImageBitmapLoader, MeshStandardMaterial, Texture, TextureLoader } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MeshLibrary } from '../../../../src/render/mvr/MeshLibrary.ts';
import { OfflineLoadingManager } from '../../../../src/render/mvr/OfflineLoadingManager.ts';
import { SharedTextureLoader } from '../../../../src/render/mvr/SharedTextureLoader.ts';
import { triangleGlb } from '../../../shared/index.ts';

const IMAGE = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const SAFARI = 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

/** Stubs `createImageBitmap` and returns the blobs it was asked to decode. */
function stubDecoder(): Blob[] {
  const blobs: Blob[] = [];
  vi.stubGlobal('createImageBitmap', (blob: Blob) => {
    blobs.push(blob);
    return Promise.resolve({ width: 1, height: 1, close: () => undefined });
  });
  return blobs;
}

/** A shared loader over `wood.png`, spelt both ways, that decodes as a parser with `parserLoader` would. */
function woodLoader(parserLoader: TextureLoader | ImageBitmapLoader): SharedTextureLoader {
  const manager = new OfflineLoadingManager(
    new Map([
      ['wood.png', IMAGE],
      ['./wood.png', IMAGE],
    ]),
  );
  const loader = new SharedTextureLoader(manager);
  loader.decodeLike(parserLoader);
  return loader;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('archive texture decoding', () => {
  it('decodes as an image element when the GLTFLoader parser picked a TextureLoader', async () => {
    const blobs = stubDecoder();
    // The parser reads the agent first and sees Safari. Later reads see jsdom, which a copied rule takes for Chrome.
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValueOnce(SAFARI);
    const decoded = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, onLoad) => {
      const texture = new Texture();
      onLoad?.(texture);
      return texture;
    });
    const library = new MeshLibrary(new Map([['a.glb', triangleGlb('wood.png')]]), new Map([['wood.png', IMAGE]]));
    const [part] = await library.parts('a.glb');
    expect(part?.material instanceof MeshStandardMaterial ? part.material.map : null).toBeInstanceOf(Texture);
    expect(decoded).toHaveBeenCalledOnce();
    expect(blobs).toEqual([]);
  });

  it('decodes to an ImageBitmap when the parser picked an ImageBitmapLoader', async () => {
    const blobs = stubDecoder();
    const library = new MeshLibrary(new Map([['a.glb', triangleGlb('wood.png')]]), new Map([['wood.png', IMAGE]]));
    const [part] = await library.parts('a.glb');
    expect(part?.material instanceof MeshStandardMaterial ? part.material.map : null).toBeInstanceOf(Texture);
    expect(blobs.map((blob) => blob.size)).toEqual([IMAGE.byteLength]);
  });

  it('keeps the first parser pick and decodes both spellings of one file once', async () => {
    const blobs = stubDecoder();
    const loader = woodLoader(new ImageBitmapLoader());
    loader.decodeLike(new TextureLoader());
    const textures = [await loader.loadAsync('wood.png'), await loader.loadAsync('./wood.png')];
    expect(textures.map((texture) => texture.source)).toEqual([textures[0]?.source, textures[0]?.source]);
    expect(blobs).toHaveLength(1);
  });

  it('drops a failed decode when the caller gave no onError', async () => {
    vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('not an image')));
    const rejections: unknown[] = [];
    const record = (reason: unknown): number => rejections.push(reason);
    process.on('unhandledRejection', record);
    const onLoad = vi.fn();
    woodLoader(new ImageBitmapLoader()).load('wood.png', onLoad);
    await new Promise((resolve) => setTimeout(resolve, 20));
    process.off('unhandledRejection', record);
    expect(onLoad).not.toHaveBeenCalled();
    expect(rejections).toEqual([]);
  });
});
