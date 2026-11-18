/**
 * Owns the `MvrStore` rule that every failure resolves `null` or `false` and never rejects: a failed or throwing open
 * (with a new try on the next call), a write that fails or aborts after its request succeeded, and a failed hash.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MvrStore } from '../../../src/io/mvrStore';
import { FakeIndexedDb } from '../../shared';

const ABC_HASH = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const abc = (): Uint8Array<ArrayBuffer> => new TextEncoder().encode('abc');

const setup = () => {
  const db = new FakeIndexedDb();
  return { db, store: new MvrStore(db.factory, globalThis.crypto.subtle) };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MvrStore failures', () => {
  it('resolves null or false when the database does not open, and opens again on the next call', async () => {
    const { db, store } = setup();
    db.failOpen = true;
    expect(await store.put(abc())).toBeNull();
    expect(await store.get(ABC_HASH)).toBeNull();
    expect(await store.delete(ABC_HASH)).toBe(false);
    db.failOpen = false;
    expect(await store.put(abc())).toBe(ABC_HASH);
  });

  it('resolves null when IndexedDB itself throws on open', async () => {
    const { db, store } = setup();
    db.throwOnOpen = true;
    expect(await store.get(ABC_HASH)).toBeNull();
    expect(await store.put(abc())).toBeNull();
  });

  it('resolves null when a write does not commit, and keeps nothing', async () => {
    const { db, store } = setup();
    db.failWrites = true;
    expect(await store.put(abc())).toBeNull();
    expect(await store.delete(ABC_HASH)).toBe(false);
    expect(db.records.size).toBe(0);
  });

  it('resolves null when the transaction aborts after its request succeeded (quota)', async () => {
    const { db, store } = setup();
    db.abortWrites = true;
    expect(await store.put(abc())).toBeNull();
    expect(db.records.size).toBe(0);
  });

  it('resolves null when hashing fails', async () => {
    const { store } = setup();
    vi.spyOn(globalThis.crypto.subtle, 'digest').mockRejectedValueOnce(new Error('no crypto'));
    expect(await store.put(abc())).toBeNull();
  });
});
