// @vitest-environment jsdom
/**
 * A glTF mesh that names an image its archive lacks parses quietly: the import already warns about the missing file,
 * so the texture is not requested, three.js logs no "Couldn't load texture" error, and the part draws in its own
 * material colour with the night look (dark and matte), not white and not black. jsdom decodes no image, so the
 * decoders are stubbed to fail as a browser fails on the empty data URL a missing file would get.
 */
import { ImageBitmapLoader, MeshStandardMaterial, Texture, TextureLoader } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MeshLibrary } from '../../../../src/render/mvr/MeshLibrary.ts';
import { triangleGlb } from '../../../shared/index.ts';

/** Makes every image decode fail, as a browser fails on `data:,`, and returns the URLs asked for. */
function failingDecoders(): string[] {
  const requested: string[] = [];
  const fail = (url: string, onError?: (error: unknown) => void): void => {
    requested.push(url);
    setTimeout(() => onError?.(new Error(`cannot decode ${url}`)), 0);
  };
  vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((url, _onLoad, _progress, onError) => {
    fail(url, onError);
    return new Texture();
  });
  vi.spyOn(ImageBitmapLoader.prototype, 'load').mockImplementation((url, _onLoad, _progress, onError) => {
    fail(url, onError);
  });
  return requested;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a texture missing from the archive', () => {
  it('is not requested, logs no error and leaves the part dark matte in its own colour', async () => {
    const requested = failingDecoders();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const library = new MeshLibrary(new Map([['prop.glb', triangleGlb('missing-satin.png')]]), new Map());
    const [part] = await library.parts('prop.glb');
    expect(errors).not.toHaveBeenCalled();
    expect(requested).toEqual([]);
    const material = part?.material;
    if (!(material instanceof MeshStandardMaterial)) throw new Error('expected the glTF standard material');
    expect(material.map).toBeNull();
    expect(material.color.r).toBeLessThan(0.1);
    expect(material.roughness).toBeGreaterThanOrEqual(0.9);
  });
});
