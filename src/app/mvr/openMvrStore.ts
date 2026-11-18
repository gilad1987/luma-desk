import { MvrStore } from '../../io/mvrStore';

/** The calls the MVR flows make on the store of original `.mvr` bytes. */
export type MvrBytesStore = Pick<MvrStore, 'get' | 'put' | 'delete'>;

/** The store of a browser that refuses IndexedDB: nothing is kept, so a reload asks for the file again. */
const NO_MVR_STORE: MvrBytesStore = {
  get: () => Promise.resolve(null),
  put: () => Promise.resolve(null),
  delete: () => Promise.resolve(false),
};

/**
 * The IndexedDB store of imported `.mvr` files. Reading the global `indexedDB` throws (SecurityError) where the
 * browser blocks storage; then every call fails softly, an import still applies and the summary warns that the file
 * was not stored.
 */
export function openMvrStore(): MvrBytesStore {
  try {
    return new MvrStore(indexedDB, crypto.subtle);
  } catch {
    return NO_MVR_STORE;
  }
}
