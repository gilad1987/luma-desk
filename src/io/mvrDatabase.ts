import { requestResult } from './requestResult';

const DB_NAME = 'lumadesk-mvr';
const DB_VERSION = 1;
/** The object store of the `.mvr` bytes, keyed by their SHA-256 hex (contract §5). */
export const STORE = 'files';

/**
 * Opens the database and makes the `files` store on the first open (contract §5). `onGone` runs when the connection
 * ends: another tab deletes or upgrades the database (the connection closes first, so that tab is not blocked), or
 * the browser closes it, as when site data is cleared; the store then forgets it and opens again on its next call.
 */
export async function openDatabase(idb: IDBFactory, onGone: () => void): Promise<IDBDatabase> {
  const request = idb.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(STORE);
  };
  const db = await requestResult(request);
  db.onversionchange = () => {
    db.close();
    onGone();
  };
  db.onclose = onGone;
  return db;
}
