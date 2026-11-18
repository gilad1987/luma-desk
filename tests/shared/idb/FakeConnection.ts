import type { FakeIndexedDb } from '../fakeIndexedDb';
import type { Handler } from './FakeRequest';
import { FakeTransaction } from './FakeTransaction';

/**
 * One fake `IDBDatabase` connection. Like a browser, `transaction` throws for a store the upgrade did not make and on
 * a closed connection, so a store that skips `createObjectStore` or keeps a closed connection fails its tests.
 */
export class FakeConnection {
  closed = false;
  onversionchange: Handler = null;
  onclose: Handler = null;
  readonly #db: FakeIndexedDb;
  readonly #stores: Set<string>;

  constructor(db: FakeIndexedDb, stores: Set<string>) {
    this.#db = db;
    this.#stores = stores;
  }

  createObjectStore(name: string): void {
    this.#stores.add(name);
  }

  transaction(name: string): FakeTransaction {
    if (this.closed) throw new Error('InvalidStateError: the connection is closed');
    if (!this.#stores.has(name)) throw new Error(`NotFoundError: no object store "${name}"`);
    return new FakeTransaction(this.#db);
  }

  close(): void {
    this.closed = true;
  }
}
