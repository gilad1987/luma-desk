/**
 * The string store that shows, layouts and the guide flag are saved in. A boundary, not an abstraction for its own
 * sake: the app passes a wrapper over `localStorage`, tests pass an in-memory fake. Both methods may throw (storage
 * full or blocked); every caller in `show/` catches that, as the original code did.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
