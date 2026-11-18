import { ImageBitmapLoader, Loader, Texture, TextureLoader } from 'three';
import { isEmbeddedUri } from '../../mvr/index';

/** The Firefox version whose `createImageBitmap` first honours the decode options GLTFLoader relies on. */
const FIREFOX_BITMAP_VERSION = 98;

/**
 * Whether GLTFLoader (three 0.160, `GLTFParser`) decodes an image to an `ImageBitmap` in this browser: only where
 * `createImageBitmap` exists and honours its options, which rules out Safari and Firefox before 98. Archive textures
 * follow the same rule, so they decode as the images a file embeds do.
 */
function decodesToBitmap(): boolean {
  if (typeof createImageBitmap === 'undefined') return false;
  const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const firefox = /Firefox\/(\d+)\./.exec(agent);
  if (firefox && Number(firefox[1]) < FIREFOX_BITMAP_VERSION) return false;
  return !/^((?!chrome|android).)*safari/i.test(agent);
}

/**
 * The loader GLTFLoader gets for each image a mesh file names by URI (`OfflineLoadingManager` registers it). Each URI
 * is decoded once per import, however many mesh files name it, and every request gets a clone: the clone shares the
 * decoded image (`Texture.source`, so the GPU uploads it once) but takes its own sampler settings, which GLTFLoader
 * writes onto the texture it receives. `MaterialPool` then pools equal textured materials across files.
 */
export class SharedTextureLoader extends Loader<Texture> {
  readonly #textures = new Map<string, Promise<Texture>>();

  override load(
    url: string,
    onLoad: (texture: Texture) => void,
    _onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ): void {
    // An embedded image belongs to one file and its URI may be megabytes long: decoded each time, never kept.
    if (isEmbeddedUri(url)) {
      void this.#decode(url).then(onLoad, onError);
      return;
    }
    let texture = this.#textures.get(url);
    if (!texture) {
      texture = this.#decode(url);
      this.#textures.set(url, texture);
    }
    void texture.then((decoded) => onLoad(decoded.clone()), onError);
  }

  /** Forgets the decoded images. The clones in use keep theirs; whoever owns those clones disposes them. */
  clear(): void {
    this.#textures.clear();
  }

  async #decode(url: string): Promise<Texture> {
    if (!decodesToBitmap()) return new TextureLoader(this.manager).loadAsync(url);
    const texture = new Texture(await new ImageBitmapLoader(this.manager).loadAsync(url));
    texture.needsUpdate = true;
    return texture;
  }
}
