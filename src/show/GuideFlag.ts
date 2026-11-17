import type { KeyValueStore } from './KeyValueStore';
import { STORAGE_KEYS } from './storageKeys';

/** Remembers that the operator has seen the first-visit guide, so it opens only once per browser. */
export class GuideFlag {
  readonly #store: KeyValueStore;

  constructor(store: KeyValueStore) {
    this.#store = store;
  }

  /** Whether the guide was seen. Unreadable storage counts as seen, so a blocked store never shows the guide (as before). */
  seen(): boolean {
    try {
      return Boolean(this.#store.getItem(STORAGE_KEYS.guideSeen));
    } catch {
      return true;
    }
  }

  /** Records that the guide was closed; a failed write is dropped and the guide shows again next visit. */
  markSeen(): void {
    try {
      this.#store.setItem(STORAGE_KEYS.guideSeen, '1');
    } catch {
      // storage full or blocked
    }
  }
}
