// @vitest-environment jsdom
/**
 * Owns the R2-6 rule of `importMvrFile`: a failed import deletes the stored bytes only when the store said, before
 * the put, that they were not there. A store that cannot tell (a read error) keeps them, because a saved show may
 * need them. The file is hashed once for the check and the put, and the stored bytes are never read back.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MvrStore } from '../../../../src/io/mvrStore';
import { MvrError } from '../../../../src/mvr/MvrWarning';
import { importMvrFile, type MvrImportDeps } from '../../../../src/ui/panels/mvr/importMvrFile';
import { FakeIndexedDb, makeMvr, sceneXml } from '../../../shared';

const FIXTURE = '<Fixture uuid="F1" name="F1"><GDTFSpec>Acme@Spot</GDTFSpec><GDTFMode>Std</GDTFMode></Fixture>';
const mvrBytes = (): Uint8Array<ArrayBuffer> =>
  new Uint8Array(makeMvr(sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${FIXTURE}</ChildList></Layer>`)));
const rejecting = () => Promise.resolve({ importMvr: () => Promise.reject(new MvrError('bad-xml', 'bad')), MvrError });

/** The real store on the fake database; `has` may be swapped for one that answers as a failed read does. */
function setup(has?: MvrImportDeps['store']['has']) {
  const db = new FakeIndexedDb();
  const real = new MvrStore(db.factory, globalThis.crypto.subtle);
  const store: MvrImportDeps['store'] = {
    hashOf: (bytes) => real.hashOf(bytes),
    has: has ?? ((hash) => real.has(hash)),
    put: (bytes, hash) => real.put(bytes, hash),
    delete: (hash) => real.delete(hash),
  };
  return { db, real, deps: { store, stage: { apply: () => {} }, cancelBuilder: () => {} } };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('importMvrFile and the bytes a failed import may delete (R2-6)', () => {
  it('keeps the bytes a saved show needs when the store cannot tell whether they were there', async () => {
    const { db, deps } = setup(() => Promise.resolve(undefined));
    expect((await importMvrFile({ name: 'a.mvr', bytes: mvrBytes() }, deps)).kind).toBe('imported');
    await importMvrFile({ name: 'a.mvr', bytes: mvrBytes() }, { ...deps, loadParser: rejecting });
    expect(db.records.size).toBe(1);
  });

  it('deletes the bytes of a new file whose import fails', async () => {
    const { db, deps } = setup();
    const outcome = await importMvrFile({ name: 'a.mvr', bytes: mvrBytes() }, { ...deps, loadParser: rejecting });
    expect([outcome.kind, db.records.size]).toEqual(['failed', 0]);
  });

  it('hashes the file once and never reads the stored bytes back', async () => {
    const { real, deps } = setup();
    const digest = vi.spyOn(globalThis.crypto.subtle, 'digest');
    const get = vi.spyOn(real, 'get');
    const outcome = await importMvrFile({ name: 'a.mvr', bytes: mvrBytes() }, { ...deps, store: real });
    expect(outcome.kind).toBe('imported');
    expect([digest.mock.calls.length, get.mock.calls.length]).toEqual([1, 0]);
  });
});
