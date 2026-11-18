/** An IndexedDB event handler slot, as the fake stores it. */
export type Handler = (() => void) | null;

/**
 * One fake `IDBRequest`. It settles in a later microtask, as in a browser, so code that reads `result` before the
 * `success` event shows up in the tests.
 */
export class FakeRequest<T> {
  result: T | undefined = undefined;
  error: Error | null = null;
  onsuccess: Handler = null;
  onerror: Handler = null;
  onupgradeneeded: Handler = null;

  /** Settles in a later microtask: success with `act()` (after the upgrade when `upgrade`), or an error. */
  settle(failed: boolean, act: () => T, upgrade = false): this {
    queueMicrotask(() => {
      if (failed) {
        this.error = new Error('fake request failed');
        this.onerror?.();
        return;
      }
      this.result = act();
      if (upgrade) this.onupgradeneeded?.();
      this.onsuccess?.();
    });
    return this;
  }
}
