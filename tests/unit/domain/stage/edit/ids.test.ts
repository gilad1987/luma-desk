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
    const at = (id: number): number => nextIdBlock({ ...d, fixtures: d.fixtures.map((f) => ({ ...f, id })) });
    expect([nextIdBlock(d), at(120), at(200), at(201)]).toEqual([401, 201, 201, 301]);
  });

  it('starts an empty design at 1', () => {
    expect(nextIdBlock({ ...sampleDesign(), fixtures: [] })).toBe(1);
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
