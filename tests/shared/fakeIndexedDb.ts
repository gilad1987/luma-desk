import { FakeConnection } from './idb/FakeConnection';
import { FakeRequest } from './idb/FakeRequest';

/**
 * A small in-memory IndexedDB for `MvrStore` tests: versioned open with upgrade, object stores, put, get, count,
 * delete, `versionchange` and a browser-side close. Requests settle in a later microtask and transactions end in a
 * later macrotask, as in a browser. The repo has no fake-indexeddb dependency; this covers only the calls the store
 * makes. The public fields are the test controls: the stored records, the number of opens, and switches for later
 * calls.
 */
export class FakeIndexedDb {
  readonly records = new Map<string, unknown>();
  /** The open request fails with an `error` event. */
  failOpen = false;
  /** `open` itself throws, as when the browser blocks storage (SecurityError). */
  throwOnOpen = false;
  /** A write request fails, and its transaction ends with `error`. */
  failWrites = false;
  /** A write request succeeds, then its transaction ends with only `abort` (quota) and the write rolls back. */
  abortWrites = false;
  opens = 0;
  readonly #stores = new Set<string>();
  readonly #connections: FakeConnection[] = [];
  #version = 0;

  /**
   * The fake as the `IDBFactory` the store expects. The one cast of the fake, at its boundary: it has only the members
   * `MvrStore` calls, not the whole DOM interface.
   */
  get factory(): IDBFactory {
    return { open: (_name: string, version: number) => this.#open(version) } as unknown as IDBFactory;
  }

  /**
   * Deletes the database as `indexedDB.deleteDatabase` does: open connections get `versionchange` first. False, and
   * nothing deleted, when a connection stays open (the browser would report `blocked`).
   */
  deleteDatabase(): boolean {
    this.#openConnections().forEach((connection) => connection.onversionchange?.());
    if (this.#openConnections().length > 0) return false;
    this.records.clear();
    this.#stores.clear();
    this.#version = 0;
    return true;
  }

  /** Closes every connection without `close()`, as a browser does when the user clears site data; fires `close`. */
  closeByBrowser(): void {
    this.#openConnections().forEach((connection) => {
      connection.close();
      connection.onclose?.();
    });
  }

  #openConnections(): FakeConnection[] {
    return this.#connections.filter((connection) => !connection.closed);
  }

  #open(version: number): FakeRequest<FakeConnection> {
    if (this.throwOnOpen) throw new Error('SecurityError');
    this.opens += 1;
    const upgrade = version > this.#version;
    const connect = (): FakeConnection => {
      this.#version = Math.max(this.#version, version);
      const connection = new FakeConnection(this, this.#stores);
      this.#connections.push(connection);
      return connection;
    };
    return new FakeRequest<FakeConnection>().settle(this.failOpen, connect, upgrade);
  }
}
