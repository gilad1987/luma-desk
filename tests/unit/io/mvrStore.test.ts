/**
 * Owns `MvrStore`: SHA-256 hex keys, put/get/delete through IndexedDB, a reload that finds the bytes again, and the
 * rule that every failure resolves `null` or `false` and never rejects. The database is the in-memory fake.
 */
import { describe, expect, it } from 'vitest';
import { MvrStore } from '../../../src/io/mvrStore';
import { FakeIndexedDb } from '../../shared';

/** SHA-256 of the three bytes "abc" (FIPS 180-2 test vector). */
const ABC_HASH = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const abc = (): Uint8Array<ArrayBuffer> => new TextEncoder().encode('abc');

const setup = () => {
  const db = new FakeIndexedDb();
  return { db, store: new MvrStore(db.factory, globalThis.crypto.subtle) };
};

describe('MvrStore', () => {
  it('stores bytes under their SHA-256 hex and reads them back', async () => {
    const { db, store } = setup();
    expect(await store.put(abc())).toBe(ABC_HASH);
    expect([...db.records.keys()]).toEqual([ABC_HASH]);
    expect(await store.get(ABC_HASH)).toEqual(abc());
  });

  it('finds the bytes from a new store on the same database, as after a reload', async () => {
    const { db, store } = setup();
    await store.put(abc());
    const reloaded = new MvrStore(db.factory, globalThis.crypto.subtle);
    expect(await reloaded.get(ABC_HASH)).toEqual(abc());
  });

  it('opens the database once for many calls', async () => {
    const { db, store } = setup();
    await store.put(abc());
    await store.get(ABC_HASH);
    await store.delete(ABC_HASH);
    expect(db.opens).toBe(1);
  });

  it('gives null for an unknown hash and for a value that is not bytes', async () => {
    const { db, store } = setup();
    expect(await store.get('0'.repeat(64))).toBeNull();
    db.records.set('text', 'not bytes');
    expect(await store.get('text')).toBeNull();
  });

  it('deletes the bytes of a hash', async () => {
    const { store } = setup();
    await store.put(abc());
    expect(await store.delete(ABC_HASH)).toBe(true);
    expect(await store.get(ABC_HASH)).toBeNull();
  });

  it('resolves null or false when the database does not open, and opens again on the next call', async () => {
    const { db, store } = setup();
    db.failOpen = true;
    expect(await store.put(abc())).toBeNull();
    expect(await store.get(ABC_HASH)).toBeNull();
    expect(await store.delete(ABC_HASH)).toBe(false);
    db.failOpen = false;
    expect(await store.put(abc())).toBe(ABC_HASH);
  });

  it('resolves null when a write does not commit, and keeps nothing', async () => {
    const { db, store } = setup();
    db.failWrites = true;
    expect(await store.put(abc())).toBeNull();
    expect(await store.delete(ABC_HASH)).toBe(false);
    expect(db.records.size).toBe(0);
  });

  it('resolves null when hashing fails', async () => {
    const db = new FakeIndexedDb();
    const subtle = { digest: () => Promise.reject(new Error('no crypto')) } as unknown as SubtleCrypto;
    expect(await new MvrStore(db.factory, subtle).put(abc())).toBeNull();
  });

  it('resolves null when IndexedDB itself throws on open', async () => {
    const idb = {
      open: () => {
        throw new Error('SecurityError');
      },
    } as unknown as IDBFactory;
    expect(await new MvrStore(idb, globalThis.crypto.subtle).get(ABC_HASH)).toBeNull();
  });
});
