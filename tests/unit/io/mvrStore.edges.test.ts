/**
 * QA edges of `MvrStore`: the same file stored by concurrent imports (a double click) and a file as large as a real
 * arena show. The bug each guards: two keys or two records for one file, a second database open, or bytes cut short.
 * Plain reads, writes and the failure paths are owned by mvrStore.test.ts and mvrStore.failures.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { MvrStore } from '../../../src/io/mvrStore';
import { FakeIndexedDb } from '../../shared';

const setup = () => {
  const db = new FakeIndexedDb();
  return { db, store: new MvrStore(db.factory, globalThis.crypto.subtle) };
};

/** `size` bytes with a marker at both ends, so a cut or a shift shows. */
function bigFile(size: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);
  bytes[0] = 1;
  bytes[size - 1] = 2;
  return bytes;
}

describe('MvrStore edges', () => {
  it('gives one key and one record when the same bytes are stored three times at once', async () => {
    const { db, store } = setup();
    const file = bigFile(1024);
    const hashes = await Promise.all([store.put(file), store.put(file.slice()), store.put(file)]);
    expect(new Set(hashes).size).toBe(1);
    expect(hashes[0]).toMatch(/^[0-9a-f]{64}$/);
    expect([db.records.size, db.opens]).toEqual([1, 1]);
  });

  it('stores and reads back a 64 MB file byte for byte', async () => {
    const { store } = setup();
    const file = bigFile(64 * 1024 * 1024);
    const hash = await store.put(file);
    const back = await store.get(hash ?? '');
    expect([back?.length, back?.[0], back?.[file.length - 1]]).toEqual([file.length, 1, 2]);
  });

  it('keeps one file while another with other bytes is deleted at the same time', async () => {
    const { store } = setup();
    const kept = bigFile(16);
    const gone = await store.put(bigFile(32));
    const [keptHash, deleted] = await Promise.all([store.put(kept), store.delete(gone ?? '')]);
    expect(deleted).toBe(true);
    expect([await store.get(gone ?? ''), (await store.get(keptHash ?? ''))?.length]).toEqual([null, 16]);
  });
});
