/**
 * Owns the load order of the MVR import: the parser chunk loads before the bytes are stored, so a chunk that does not
 * load rejects the import and leaves nothing in IndexedDB and nothing applied.
 */
import { describe, expect, it, vi } from 'vitest';
import { MvrStore } from '../../../../src/io/mvrStore';
import { importMvrFile } from '../../../../src/ui/panels/mvr/importMvrFile';
import { FakeIndexedDb } from '../../../shared';

const chunkError = 'Failed to fetch dynamically imported module';

describe('importMvrFile chunk load', () => {
  it('rejects without stored bytes when the parser chunk does not load', async () => {
    const db = new FakeIndexedDb();
    const store = new MvrStore(db.factory, globalThis.crypto.subtle);
    const apply = vi.fn();
    const loadParser = (): Promise<never> => Promise.reject(new Error(chunkError));
    const file = { name: 'show.mvr', bytes: new TextEncoder().encode('bytes') };
    await expect(importMvrFile(file, { store, stage: { apply }, loadParser })).rejects.toThrow(chunkError);
    expect(db.records.size).toBe(0);
    expect(apply).not.toHaveBeenCalled();
  });
});
