import { LoadingManager } from 'three';

/** What a loader gets instead of a file outside the archive: an empty data URL, which fails without a request. */
const NO_FILE = 'data:,';

/** The URLs GLTFLoader makes from the file's own bytes: an embedded image or buffer. */
const EMBEDDED_URL = /^(blob|data):/;

/**
 * A loading manager that never asks the network. A 3DS material names its texture file and a glTF may name an
 * external image or buffer; the loaders would fetch those names from the app's own origin, which holds none of them.
 * Embedded data passes through. A name found in `resources` (`MvrImport.meshResources`) is served from the archive's
 * bytes as a `blob:` URL; any other name gets an empty data URL. Call `dispose` once the parse has ended: the loaders
 * have read every file by then, and it revokes the blob URLs so the bytes can be freed.
 */
export class OfflineLoadingManager extends LoadingManager {
  readonly #resources: ReadonlyMap<string, Uint8Array>;
  readonly #blobUrls = new Map<string, string>();

  /** `resources` holds the files the meshes name, keyed by the URI as the file writes it; none by default. */
  constructor(resources: ReadonlyMap<string, Uint8Array> = new Map()) {
    super();
    this.#resources = resources;
    this.setURLModifier((url) => this.#resolve(url));
  }

  /** Revokes every blob URL this manager made. */
  dispose(): void {
    for (const blobUrl of this.#blobUrls.values()) URL.revokeObjectURL(blobUrl);
    this.#blobUrls.clear();
  }

  #resolve(url: string): string {
    const bytes = this.#resources.get(url);
    if (!bytes) return EMBEDDED_URL.test(url) ? url : NO_FILE;
    let blobUrl = this.#blobUrls.get(url);
    if (!blobUrl) {
      // `Blob` takes only views of a plain ArrayBuffer; `slice` copies the archive bytes into one.
      blobUrl = URL.createObjectURL(new Blob([bytes.slice()]));
      this.#blobUrls.set(url, blobUrl);
    }
    return blobUrl;
  }
}
