/**
 * Owns the id rules of the edit ops: fixture id blocks and readable unique string ids. It catches a new batch that
 * shares a hundred with an older one, or a string id that clashes. Which op uses which id is tested with that op.
 */
import { describe, expect, it } from 'vitest';
import { newTrussId, newUniqueId, nextIdBlock } from '../../../../../src/domain/stage/edit/ids.ts';
import { sampleDesign } from './sampleDesign.ts';

describe('nextIdBlock', () => {
  it('starts the block after the highest id, rounded up to a full hundred', () => {
    const d = sampleDesign();
    const at = (id: number): number => nextIdBlock({ ...d, fixtures: d.fixtures.map((f) => ({ ...f, id })) }, 1);
    expect([nextIdBlock(d, 1), at(120), at(200), at(201)]).toEqual([401, 201, 201, 301]);
  });

  it('starts an empty design at 1', () => {
    expect(nextIdBlock({ ...sampleDesign(), fixtures: [] }, 1)).toBe(1);
  });

  it('refuses a batch whose last id would pass Number.MAX_SAFE_INTEGER, even past one block of 100', () => {
    const d = sampleDesign();
    const high = { ...d, fixtures: [{ ...d.fixtures[0], id: 9_007_199_254_740_800 }] } as typeof d;
    // the block starts at 9007199254740801, so 191 ids end on MAX_SAFE_INTEGER and 192 pass it
    expect(nextIdBlock(high, 191)).toBe(9_007_199_254_740_801);
    expect(() => nextIdBlock(high, 192)).toThrow(/nextIdBlock: no 192 safe fixture ids after 9007199254740800/);
  });
});

describe('newUniqueId', () => {
  it('takes the smallest free number for the base', () => {
    const items = [{ id: 'riser-1' }, { id: 'riser-3' }];
    expect([newUniqueId(items, 'riser'), newUniqueId([], 'riser')]).toEqual(['riser-2', 'riser-1']);
  });

  it('names a truss id after its kind', () => {
    expect([newTrussId(sampleDesign(), 'straight'), newTrussId(sampleDesign(), 'circle')]).toEqual([
      'straight-1',
      'circle-1',
    ]);
  });
});
