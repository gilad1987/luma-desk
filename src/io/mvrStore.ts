import { requestResult } from './requestResult';
import { sha256Hex } from './sha256Hex';
import { transactionDone } from './transactionDone';

const DB_NAME = 'lumadesk-mvr';
const DB_VERSION = 1;
const STORE = 'files';

/** Opens the database and makes the `files` store on the first open (contract §5). */
function openDatabase(idb: IDBFactory): Promise<IDBDatabase> {
  const request = idb.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(STORE);
  };
  return requestResult(request);
}

/**
 * The original `.mvr` bytes, kept in IndexedDB by their SHA-256 hex (contract §5). The show file holds only the
 * design and `source.fileHash`, because the mesh files are too large for localStorage; on boot the geometry is read
 * again from these bytes.
 *
 * Every method resolves `null` (or `false`) on any error and never rejects: private browsing, a full disk or a
 * missing IndexedDB must not stop the desk, and the callers already have a path for a file that is not there.
 * `IDBFactory` and `SubtleCrypto` come from main.ts, so tests give a fake database and the real Node crypto.
 */
export class MvrStore {
  readonly #idb: IDBFactory;
  readonly #subtle: SubtleCrypto;
  /** Opened on first use and kept; reset after a failed open so a later call tries again. */
  #db: Promise<IDBDatabase> | null = null;

  constructor(idb: IDBFactory, subtle: SubtleCrypto) {
    this.#idb = idb;
    this.#subtle = subtle;
  }

  /** Stores the bytes and resolves their hash once the write has committed, or `null` when it failed. */
  async put(bytes: Uint8Array<ArrayBuffer>): Promise<string | null> {
    try {
      const hash = await sha256Hex(this.#subtle, bytes);
      const transaction = (await this.#open()).transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(bytes, hash);
      await transactionDone(transaction);
      return hash;
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
    this.#db ??= openDatabase(this.#idb).catch((error: unknown) => {
      this.#db = null;
      throw error;
    });
    return this.#db;
  }
}
