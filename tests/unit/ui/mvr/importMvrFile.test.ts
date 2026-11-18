// @vitest-environment jsdom
/**
 * Owns the MVR import flow: the bytes are stored before the stage is applied with cause `import`, the design carries
 * the hash, a store failure still imports (`stored: false`), and a rejected file changes nothing and leaves no bytes.
 */
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import type { RigChangeCause } from '../../../../src/engine/stage/rigChanged';
import { MvrStore } from '../../../../src/io/mvrStore';
import { importMvrFile } from '../../../../src/ui/panels/mvr/importMvrFile';
import { FakeIndexedDb, makeMvr, sceneXml } from '../../../shared';

const FIXTURE = '<Fixture uuid="F1" name="F1"><GDTFSpec>Acme@Spot</GDTFSpec><GDTFMode>Std</GDTFMode></Fixture>';
const bytes = (): Uint8Array<ArrayBuffer> =>
  new Uint8Array(makeMvr(sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${FIXTURE}</ChildList></Layer>`)));

/** A store on the fake database and a stage that records what was applied and what the database held then. */
function setup() {
  const db = new FakeIndexedDb();
  const store = new MvrStore(db.factory, globalThis.crypto.subtle);
  const applied: { design: StageDesign; cause: RigChangeCause; storedThen: number }[] = [];
  const stage = {
    apply: (design: StageDesign, cause: Exclude<RigChangeCause, 'boot'>) =>
      void applied.push({ design, cause, storedThen: db.records.size }),
  };
  return { db, deps: { store, stage, cancelBuilder: () => {} }, applied };
}

describe('importMvrFile', () => {
  it('stores the bytes, then applies the design with cause import and the file hash', async () => {
    const { db, deps, applied } = setup();
    const outcome = await importMvrFile({ name: 'show.mvr', bytes: bytes() }, deps);
    const [hash] = [...db.records.keys()];
    expect(outcome.kind).toBe('imported');
    expect(applied).toHaveLength(1);
    expect(applied[0]?.cause).toBe('import');
    expect(applied[0]?.storedThen).toBe(1);
    expect(applied[0]?.design.source).toEqual({ kind: 'mvr', name: 'show.mvr', fileHash: hash });
    expect(outcome.kind === 'imported' && outcome.stored).toBe(true);
  });

  it('still imports when the store refuses the bytes, without a hash', async () => {
    const { db, deps, applied } = setup();
    db.failWrites = true;
    const outcome = await importMvrFile({ name: 'show.mvr', bytes: bytes() }, deps);
    expect(outcome.kind === 'imported' && outcome.stored).toBe(false);
    expect(applied[0]?.design.source.fileHash).toBeUndefined();
  });

  it('reports a file that is not an MVR, applies nothing and removes the stored bytes', async () => {
    const { db, deps, applied } = setup();
    const outcome = await importMvrFile({ name: 'x.mvr', bytes: new TextEncoder().encode('not a zip') }, deps);
    expect(outcome.kind).toBe('failed');
    expect(outcome.kind === 'failed' && outcome.message.length).toBeGreaterThan(0);
    expect(applied).toEqual([]);
    expect(db.records.size).toBe(0);
  });
});
