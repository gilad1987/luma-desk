/**
 * A small in-memory IndexedDB for `MvrStore` tests: open with upgrade, one object store, put, get and delete. Request
 * handlers run in a later microtask and transactions end in a later macrotask, as in a browser, so code that does not
 * wait for the commit shows up. The repo has no fake-indexeddb dependency; this covers only the calls the store makes.
 */
type Handler = (() => void) | null;

class FakeRequest<T> {
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

class FakeTransaction {
  error: Error | null = null;
  oncomplete: Handler = null;
  onerror: Handler = null;
  onabort: Handler = null;
  #failed = false;
  readonly db: FakeIndexedDb;

  constructor(db: FakeIndexedDb) {
    this.db = db;
    setTimeout(() => {
      if (!this.#failed) return this.oncomplete?.();
      this.error = new Error('fake transaction failed');
      this.onerror?.();
    }, 0);
  }

  objectStore(): object {
    const write = <T>(act: () => T): FakeRequest<T> => {
      this.#failed ||= this.db.failWrites;
      return new FakeRequest<T>().settle(this.db.failWrites, act);
    };
    return {
      put: (value: unknown, key: string) => write(() => this.db.records.set(key, value)),
      get: (key: string) => new FakeRequest<unknown>().settle(false, () => this.db.records.get(key)),
      delete: (key: string) => write(() => this.db.records.delete(key)),
    };
  }
}

/** The test controls: the stored records, the number of opens, and switches that make later calls fail. */
export class FakeIndexedDb {
  readonly records = new Map<string, unknown>();
  failOpen = false;
  failWrites = false;
  opens = 0;
  #hasStore = false;

  /** The fake as the `IDBFactory` the store expects; only `open` exists. */
  get factory(): IDBFactory {
    return { open: () => this.#open() } as unknown as IDBFactory;
  }

  #open(): FakeRequest<object> {
    this.opens += 1;
    const database = {
      createObjectStore: () => (this.#hasStore = true),
      transaction: () => new FakeTransaction(this),
    };
    return new FakeRequest<object>().settle(this.failOpen, () => database, !this.#hasStore);
  }
}
