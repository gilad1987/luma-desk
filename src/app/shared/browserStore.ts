import { type KeyValueStore, STORAGE_KEYS } from '../../show';

/**
 * `localStorage` behind the store boundary. It is read on each call, not captured at boot, as the original wrapper
 * did: a browser that blocks storage fails only the save or load that touches it, never the boot.
 */
export const browserStore: KeyValueStore = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
};

/**
 * The saved show text, read once before the engine is built so a saved stage can be the first rig. A browser that
 * blocks storage gives `null` (the built-in stage); the later show restore reports that failure as before.
 */
export function readSavedShowText(): string | null {
  try {
    return browserStore.getItem(STORAGE_KEYS.show);
  } catch {
    return null;
  }
}
