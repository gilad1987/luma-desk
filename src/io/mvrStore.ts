import { openDatabase, STORE } from './mvrDatabase';
import { requestResult } from './requestResult';
import { sha256Hex } from './sha256Hex';
import { transactionDone } from './transactionDone';

/**
 * The original `.mvr` bytes, kept in IndexedDB by their SHA-256 hex (contract §5). The show file holds only the
 * design and `source.fileHash`, because the mesh files are too large for localStorage; on boot the geometry is read
 * again from these bytes.
 *
 * Every method resolves `null` (`false`, or `undefined` for `has`) on any error and never rejects: private browsing,
 * a full disk or a missing IndexedDB must not stop the desk, and the callers already have a path for a file that is
 * not there. `IDBFactory` and `SubtleCrypto` come from main.ts, so tests give a fake database and the real Node crypto.
 */
export class MvrStore {
  readonly #idb: IDBFactory;
  readonly #subtle: SubtleCrypto;
  /** Opened on first use and kept; reset after a failed open or a close, so a later call opens again. */
  #db: Promise<IDBDatabase> | null = null;

  constructor(idb: IDBFactory, subtle: SubtleCrypto) {
    this.#idb = idb;
    this.#subtle = subtle;
  }

  /** The key of `bytes` (SHA-256 hex), or `null` when hashing failed; `put` takes it, so a file is hashed once. */
  async hashOf(bytes: Uint8Array<ArrayBuffer>): Promise<string | null> {
    try {
      return await sha256Hex(this.#subtle, bytes);
    } catch {
      return null;
    }
  }

  /**
   * Stores the bytes under `hash` (by default their own hash) and resolves the key once the write has committed, or
   * `null` when it failed.
   */
  async put(bytes: Uint8Array<ArrayBuffer>, hash?: string): Promise<string | null> {
    try {
      const key = hash ?? (await sha256Hex(this.#subtle, bytes));
      const transaction = (await this.#open()).transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(bytes, key);
      await transactionDone(transaction);
      return key;
    } catch {
      return null;
    }
  }

  /** The stored bytes of `hash`, or `null` when they are not there or cannot be read. */
  async get(hash: string): Promise<Uint8Array | null> {
    try {
      const transaction = (await this.#open()).transaction(STORE, 'readonly');
      const value: unknown = await requestResult(transaction.objectStore(STORE).get(hash));
      return value instanceof Uint8Array ? value : null;
    } catch {
      return null;
    }
  }

  /** Whether bytes are stored under `hash`, without reading them; `undefined` when the store cannot tell (an error). */
  async has(hash: string): Promise<boolean | undefined> {
    try {
      const transaction = (await this.#open()).transaction(STORE, 'readonly');
      return (await requestResult(transaction.objectStore(STORE).count(hash))) > 0;
    } catch {
      return undefined;
    }
  }

  /** Removes the bytes of `hash`; true once the removal committed, also when nothing was stored under it. */
  async delete(hash: string): Promise<boolean> {
    try {
      const transaction = (await this.#open()).transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).delete(hash);
      await transactionDone(transaction);
      return true;
    } catch {
      return false;
    }
  }

  #open(): Promise<IDBDatabase> {
    this.#db ??= openDatabase(this.#idb, () => (this.#db = null)).catch((error: unknown) => {
      this.#db = null;
      throw error;
    });
    return this.#db;
  }
}
