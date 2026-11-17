import type { KeyValueStore } from './KeyValueStore';
import type { ShowFileV1 } from './ShowFile';
import { STORAGE_KEYS } from './storageKeys';

/** How long the show must stay unchanged before it is written, so a fader drag saves once, not on every step. */
export const PERSIST_DELAY_MS = 500;

/** Saves the show to the browser store, debounced, and reads back the saved text at boot. */
export class ShowStorage {
  readonly #store: KeyValueStore;
  readonly #show: () => ShowFileV1;
  #timer: ReturnType<typeof setTimeout> | undefined;

  /** `show` is called when the save runs, so the file holds the state at that moment, not at the request. */
  constructor(store: KeyValueStore, show: () => ShowFileV1) {
    this.#store = store;
    this.#show = show;
  }

  /**
   * Asks for a save; each call restarts the delay. A failed write (storage full or blocked) is dropped without a
   * word, as before: the refactor changes no UI, and the operator is not told (known quirk).
   */
  persist(): void {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      try {
        this.#store.setItem(STORAGE_KEYS.show, JSON.stringify(this.#show()));
      } catch {
        // storage full or blocked: the show stays unsaved, as it always did
      }
    }, PERSIST_DELAY_MS);
  }

  /** The saved show text, or null when none was saved. Throws when the store does; boot catches it. */
  saved(): string | null {
    return this.#store.getItem(STORAGE_KEYS.show);
  }
}
