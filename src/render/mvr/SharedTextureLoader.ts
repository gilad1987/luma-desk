import { ImageBitmapLoader, Loader, Texture, TextureLoader } from 'three';
import { archiveName, isEmbeddedUri } from '../../mvr/index';

/**
 * The loader GLTFLoader gets for each image a mesh file names by URI (`OfflineLoadingManager` registers it). Each
 * archive file is decoded once per import, however many mesh files name it, and every request gets a clone: the clone
 * shares the decoded image (`Texture.source`, so the GPU uploads it once) but takes its own sampler settings, which
 * GLTFLoader writes onto the texture it receives. `MaterialPool` then pools equal textured materials across files.
 */
export class SharedTextureLoader extends Loader<Texture> {
  readonly #textures = new Map<string, Promise<Texture>>();
  #decodesToBitmap: boolean | undefined;

  /**
   * Decodes as `parserLoader` does. GLTFLoader picks an `ImageBitmapLoader` or a `TextureLoader` for each parser by
   * browser, and the images a file embeds decode through it; archive images must decode the same way. The first
   * parser decides: the pick depends only on the browser, so every later parser of the import makes the same one.
   */
  decodeLike(parserLoader: TextureLoader | ImageBitmapLoader): void {
    this.#decodesToBitmap ??= 'isImageBitmapLoader' in parserLoader;
  }

  /**
   * Gives `onLoad` a clone of the decode of the archive file `url` names. The decodes are keyed by that file
   * (`archiveName`), so two spellings of one file share a decode. An embedded image belongs to one mesh file and its
   * URI may be megabytes long, so it is decoded each time and never kept. A failed decode goes to `onError` only.
   */
  override load(
    url: string,
    onLoad: (texture: Texture) => void,
    _onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ): void {
    const fail = (error: unknown): void => onError?.(error);
    if (isEmbeddedUri(url)) {
      void this.#decode(url).then(onLoad, fail);
      return;
    }
    const name = archiveName(url);
    let texture = this.#textures.get(name);
    if (!texture) {
      texture = this.#decode(url);
      this.#textures.set(name, texture);
    }
    void texture.then((decoded) => onLoad(decoded.clone()), fail);
  }

  /** Forgets the decoded images. The clones in use keep theirs; whoever owns those clones disposes them. */
  clear(): void {
    this.#textures.clear();
  }

  /**
   * Decodes as GLTFLoader's own loaders do: an `ImageBitmapLoader` with its default options wrapped in a texture,
   * or a `TextureLoader`. Before any parser has chosen, it uses the `TextureLoader`, GLTFLoader's fallback.
   */
  async #decode(url: string): Promise<Texture> {
    if (this.#decodesToBitmap !== true) return new TextureLoader(this.manager).loadAsync(url);
    const texture = new Texture(await new ImageBitmapLoader(this.manager).loadAsync(url));
    texture.needsUpdate = true;
    return texture;
  }
}
