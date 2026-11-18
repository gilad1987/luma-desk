/**
 * Owns the boot decision for an imported design: only an `mvr` design with a `fileHash` looks in the store, and it is
 * `missing` when the store has no bytes and `found` (with the bytes) when it has them.
 */
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { storedMvrOf } from '../../../../src/ui/panels/mvr/missingMvr';

const BYTES = new Uint8Array([1, 2, 3]);
const theatre = createTemplate('theatre');
const mvrDesign = (fileHash?: string): StageDesign => ({
  ...theatre,
  source: fileHash === undefined ? { kind: 'mvr', name: 'rig.mvr' } : { kind: 'mvr', name: 'rig.mvr', fileHash },
});

/** A store that holds `BYTES` under the hash "known" and records every lookup. */
function storeWith() {
  const lookups: string[] = [];
  const get = (hash: string) => {
    lookups.push(hash);
    return Promise.resolve(hash === 'known' ? BYTES : null);
  };
  return { store: { get }, lookups };
}

describe('storedMvrOf', () => {
  it('is none for a design that is not an MVR import, without a lookup', async () => {
    const { store, lookups } = storeWith();
    expect(await storedMvrOf(theatre, store)).toEqual({ kind: 'none' });
    expect(await storedMvrOf(mvrDesign(), store)).toEqual({ kind: 'none' });
    expect(lookups).toEqual([]);
  });

  it('is missing, with the file name, when the store has no bytes for the hash', async () => {
    const { store } = storeWith();
    expect(await storedMvrOf(mvrDesign('gone'), store)).toEqual({ kind: 'missing', fileName: 'rig.mvr' });
  });

  it('is found, with the bytes, when the store has them', async () => {
    const { store, lookups } = storeWith();
    expect(await storedMvrOf(mvrDesign('known'), store)).toEqual({ kind: 'found', bytes: BYTES });
    expect(lookups).toEqual(['known']);
  });
});
