/**
 * Owns `MvrStore.has` and the hash the import reuses: `has` tells stored bytes from missing ones without reading them
 * and resolves `undefined` when the store cannot tell; `hashOf` is the key `put` stores under, and `put` takes it.
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

describe('MvrStore.has and hashOf', () => {
  it('is false before the put and true after it', async () => {
    const { store } = setup();
    expect(await store.has(ABC_HASH)).toBe(false);
    await store.put(abc());
    expect(await store.has(ABC_HASH)).toBe(true);
  });

  it.each([['fails', 'failOpen'] as const, ['throws', 'throwOnOpen'] as const])(
    'is undefined, not false, when the open %s',
    async (_label, failure) => {
      const { db, store } = setup();
      db[failure] = true;
      expect(await store.has(ABC_HASH)).toBeUndefined();
    },
  );

  it('hashes as put does, and put stores under a hash it is given without hashing again', async () => {
    const { db, store } = setup();
    expect(await store.hashOf(abc())).toBe(ABC_HASH);
    const digest = vi.spyOn(globalThis.crypto.subtle, 'digest');
    expect(await store.put(abc(), ABC_HASH)).toBe(ABC_HASH);
    expect([[...db.records.keys()], digest.mock.calls.length]).toEqual([[ABC_HASH], 0]);
  });

  it('resolves a null hash when hashing fails', async () => {
    const { store } = setup();
    vi.spyOn(globalThis.crypto.subtle, 'digest').mockRejectedValueOnce(new Error('no crypto'));
    expect(await store.hashOf(abc())).toBeNull();
  });
});
