// @vitest-environment jsdom
/**
 * QA edges of `importMvrFile`: files that are not an MVR in other ways than "not a zip" (empty, a zip without the
 * scene), a rejected file when the store had refused the bytes, and one file imported twice. The bug each guards:
 * bytes left in IndexedDB for a file the desk rejected, a delete of a key that was never stored, or a duplicate record.
 * The main path and "not a zip" are owned by importMvrFile.test.ts.
 */
import { describe, expect, it, vi } from 'vitest';
import { MvrStore } from '../../../../src/io/mvrStore';
import { MvrError } from '../../../../src/mvr/MvrWarning';
import { importMvrFile, type MvrImportDeps } from '../../../../src/ui/panels/mvr/importMvrFile';
import { FakeIndexedDb, makeMvr, makeZip, sceneXml } from '../../../shared';

const FIXTURE = '<Fixture uuid="F1" name="F1"><GDTFSpec>Acme@Spot</GDTFSpec><GDTFMode>Std</GDTFMode></Fixture>';
const mvrBytes = (): Uint8Array<ArrayBuffer> =>
  new Uint8Array(makeMvr(sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${FIXTURE}</ChildList></Layer>`)));

/** A real store on the fake database, a stage that counts applies, and a log of the store's deletes. */
function setup() {
  const db = new FakeIndexedDb();
  const real = new MvrStore(db.factory, globalThis.crypto.subtle);
  const deleted: string[] = [];
  let applies = 0;
  const deps: MvrImportDeps = {
    store: {
      get: (hash) => real.get(hash),
      put: (bytes) => real.put(bytes),
      delete: (hash) => (deleted.push(hash), real.delete(hash)),
    },
    stage: { apply: () => void (applies += 1) },
    cancelBuilder: () => {},
  };
  return { db, deps, deleted, applies: () => applies };
}

describe('importMvrFile edges', () => {
  it.each([
    ['an empty file', new Uint8Array(0)],
    ['a zip without the scene file', new Uint8Array(makeZip({ 'readme.txt': 'hi' }))],
  ])('rejects %s and leaves no bytes stored', async (_label, bytes) => {
    const { db, deps, deleted, applies } = setup();
    const outcome = await importMvrFile({ name: 'x.mvr', bytes }, deps);
    expect([outcome.kind, applies(), db.records.size, deleted.length]).toEqual(['failed', 0, 0, 1]);
  });

  it('takes the stored bytes out on an error that is no MvrError, and rejects with it (R2-6)', async () => {
    const { db, deps, deleted, applies } = setup();
    const broken = new SyntaxError('Unexpected token b in JSON');
    const loadParser = () => Promise.resolve({ importMvr: () => Promise.reject(broken), MvrError });
    await expect(importMvrFile({ name: 'a.mvr', bytes: mvrBytes() }, { ...deps, loadParser })).rejects.toBe(broken);
    expect([applies(), db.records.size, deleted.length]).toEqual([0, 0, 1]);
  });

  it.each([
    ['a rejected file', new MvrError('bad-xml', 'bad')],
    ['an error that is no MvrError', new SyntaxError('Unexpected token b in JSON')],
  ])('keeps the bytes a saved show may need on %s that was stored before (R2-6)', async (_label, error) => {
    const { db, deps, deleted } = setup();
    expect((await importMvrFile({ name: 'a.mvr', bytes: mvrBytes() }, deps)).kind).toBe('imported');
    const loadParser = () => Promise.resolve({ importMvr: () => Promise.reject(error), MvrError });
    await importMvrFile({ name: 'b.mvr', bytes: mvrBytes() }, { ...deps, loadParser }).catch(() => undefined);
    expect([db.records.size, deleted]).toEqual([1, []]);
  });

  it('deletes nothing for a rejected file the store had refused', async () => {
    const { db, deps, deleted } = setup();
    db.failWrites = true;
    const outcome = await importMvrFile({ name: 'x.mvr', bytes: new TextEncoder().encode('not a zip') }, deps);
    expect([outcome.kind, deleted]).toEqual(['failed', []]);
  });

  it('keeps one record when the same file is imported twice, and both imports carry its hash', async () => {
    const { db, deps, applies } = setup();
    const first = await importMvrFile({ name: 'a.mvr', bytes: mvrBytes() }, deps);
    const second = await importMvrFile({ name: 'b.mvr', bytes: mvrBytes() }, deps);
    const hashOf = (outcome: typeof first): string | undefined =>
      outcome.kind === 'imported' ? outcome.result.design.source.fileHash : undefined;
    expect([db.records.size, applies(), hashOf(first) === hashOf(second)]).toEqual([1, 2, true]);
    expect(hashOf(first)).toMatch(/^[0-9a-f]{64}$/);
  });

  // the cause of the flaky test above: the same sample zipped across a 2-second step had other bytes
  it('builds the same sample bytes at any time', () => {
    vi.useFakeTimers({ now: new Date(2026, 0, 1, 12, 0, 0) });
    const before = mvrBytes();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 3));
    const after = mvrBytes();
    vi.useRealTimers();
    expect(after).toEqual(before);
  });
});
