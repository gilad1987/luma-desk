import { LoadingManager } from 'three';

/** What a loader gets instead of a file outside the archive: an empty data URL, which fails without a request. */
const NO_FILE = 'data:,';

/**
 * A loading manager that never asks the network. A 3DS material names its texture file and a glTF may name an
 * external image or buffer; the loaders would fetch those names from the app's own origin, which holds none of them.
 * Embedded data passes through: the `blob:` and `data:` URLs that GLTFLoader makes from the file's own bytes.
 */
export function offlineLoadingManager(): LoadingManager {
  const manager = new LoadingManager();
  manager.setURLModifier((url) => (/^(blob|data):/.test(url) ? url : NO_FILE));
  return manager;
}
