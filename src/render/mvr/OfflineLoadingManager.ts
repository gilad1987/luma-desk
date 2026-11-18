import { LoadingManager, type ImageBitmapLoader, type TextureLoader } from 'three';
import { isEmbeddedUri } from '../../mvr/index';
import { SharedTextureLoader } from './SharedTextureLoader';

/** What a loader gets instead of a file outside the archive: an empty data URL, which fails without a request. */
const NO_FILE = 'data:,';

/** GLTFLoader asks the manager for a loader per image URI; this pattern hands every one to the shared loader. */
const EVERY_URI = /^/;

/**
 * A loading manager that never asks the network, shared by every parse of one import. A 3DS material names its
 * texture file and a glTF may name an external image or buffer; the loaders would fetch those names from the app's
 * own origin, which holds none of them. Embedded data passes through. A name found in `resources`
 * (`MvrImport.meshResources`) is served from the archive's bytes as one `blob:` URL, and an image a file names is
 * decoded once for all files (`SharedTextureLoader`); any other name gets an empty data URL. Call `dispose` once no
 * parse runs: it revokes the blob URLs and drops the archive bytes, so they can be freed.
 */
export class OfflineLoadingManager extends LoadingManager {
  #resources: ReadonlyMap<string, Uint8Array>;
  readonly #blobUrls = new Map<string, string>();
  readonly #textures = new SharedTextureLoader(this);

  /** `resources` holds the files the meshes name, keyed by the URI as the file writes it. */
  constructor(resources: ReadonlyMap<string, Uint8Array>) {
    super();
    this.#resources = resources;
    this.setURLModifier((url) => this.#resolve(url));
    this.addHandler(EVERY_URI, this.#textures);
  }

  /**
   * Decodes the archive images as GLTFLoader decodes embedded ones; `parserLoader` is `GLTFParser.textureLoader`.
   * See `SharedTextureLoader.decodeLike`.
   */
  decodeLike(parserLoader: TextureLoader | ImageBitmapLoader): void {
    this.#textures.decodeLike(parserLoader);
  }

  /** Revokes every blob URL this manager made and lets go of the archive bytes and the decoded images. */
  dispose(): void {
    for (const blobUrl of this.#blobUrls.values()) URL.revokeObjectURL(blobUrl);
    this.#blobUrls.clear();
    this.#resources = new Map();
    this.#textures.clear();
  }

  #resolve(url: string): string {
    const bytes = this.#resources.get(url);
    if (!bytes) return isEmbeddedUri(url) ? url : NO_FILE;
    let blobUrl = this.#blobUrls.get(url);
    if (!blobUrl) {
      // `Blob` takes only views of a plain ArrayBuffer; `slice` copies the archive bytes into one.
      blobUrl = URL.createObjectURL(new Blob([bytes.slice()]));
      this.#blobUrls.set(url, blobUrl);
    }
    return blobUrl;
  }
}
