/**
 * Owns the `patch` rule of `appendCopies` (contract Amendment 3): duplicate and mirror never copy a fixture's DMX
 * patch, as two fixtures on one address would answer the same channels. Ids and truss links are owned by
 * itemOps.test.ts and mirror.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { duplicateFixtures, duplicateTruss } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { mirrorLeftToRight } from '../../../../../src/domain/stage/edit/mirror.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { sampleDesign } from './sampleDesign.ts';

/** The sample design with every fixture patched, as an MVR import leaves it. */
function patchedDesign(): StageDesign {
  const d = sampleDesign();
  const fixtures = d.fixtures.map((f, i) => ({ ...f, patch: { universe: 1, address: 1 + 20 * i, mode: 'Mode 1' } }));
  return { ...d, fixtures };
}

/** The fixtures `next` added to `d`, as `[id, has a patch]` pairs. */
function addedPatches(d: StageDesign, next: StageDesign): [number, boolean][] {
  return next.fixtures.slice(d.fixtures.length).map((f) => [f.id, 'patch' in f]);
}

describe('appendCopies drops the DMX patch', () => {
  it('duplicate gives the copy no patch and keeps the source patch', () => {
    const d = patchedDesign();
    const next = duplicateFixtures(d, [101]);
    const added = addedPatches(d, next);
    expect(added.length).toBeGreaterThan(0);
    expect(added.filter(([, patched]) => patched)).toEqual([]);
    expect(next.fixtures.slice(0, d.fixtures.length)).toEqual(d.fixtures);
  });

  it('truss duplicate gives the copied fixtures no patch', () => {
    const d = patchedDesign();
    const added = addedPatches(d, duplicateTruss(d, 'pipe-1'));
    expect(added.length).toBeGreaterThan(0);
    expect(added.filter(([, patched]) => patched)).toEqual([]);
  });

  it('mirror gives the copies no patch', () => {
    const d = patchedDesign();
    const added = addedPatches(d, mirrorLeftToRight(d));
    expect(added.length).toBeGreaterThan(0);
    expect(added.filter(([, patched]) => patched)).toEqual([]);
  });
});
