/**
 * Auto-patching of fixtures without a patch: fresh universes after the highest kept one, fixture-id order, and a
 * new universe when a footprint does not fit. An overlap here makes two exported fixtures answer the same channels.
 */
import { describe, expect, it } from 'vitest';
import { MAX_UNIVERSE } from '../../../../src/domain/stage/parse/parsePatch.ts';
import type { StageFixture } from '../../../../src/domain/stage/StageDesign.ts';
import { planPatches } from '../../../../src/mvr/export/autoPatch.ts';

const fixture = (id: number, patch?: StageFixture['patch']): StageFixture => ({
  id,
  type: 'spot',
  role: 'front',
  trussId: null,
  position: [0, 0, 0],
  mount: 'hang',
  ...(patch ? { patch } : {}),
});

describe('planPatches', () => {
  it('keeps a real patch and assigns the rest in id order after its universe', () => {
    const kept = { universe: 2, address: 40, mode: 'Mode 2' };
    const { patches, autoPatched } = planPatches([fixture(9), fixture(3, kept), fixture(5)], undefined);
    expect([autoPatched, patches.get(3), patches.get(5), patches.get(9)]).toStrictEqual([
      2,
      kept,
      { universe: 3, address: 1, mode: 'Mode 1' },
      { universe: 3, address: 11, mode: 'Mode 1' },
    ]);
  });

  it('starts a new universe when a 10-channel spot does not fit in the rest', () => {
    const { patches } = planPatches(
      Array.from({ length: 52 }, (_, index) => fixture(index + 1)),
      undefined,
    );
    expect([patches.get(51), patches.get(52)]).toStrictEqual([
      { universe: 1, address: 501, mode: 'Mode 1' },
      { universe: 2, address: 1, mode: 'Mode 1' },
    ]);
  });

  it('leaves fixtures unpatched past universe 63999 and counts them instead of throwing', () => {
    const top = { universe: 63_999, address: 1, mode: 'Mode 1' };
    const plan = planPatches([fixture(1, top), fixture(2), fixture(3)], undefined);
    expect([plan.patches.has(2), plan.patches.has(3), plan.autoPatched, plan.unplaced]).toEqual([false, false, 0, 2]);
  });

  // 51 ten-channel spots fill the last universe; the 52nd would start universe 64000, which MVR cannot address.
  it('fills the last universe and leaves only the fixtures past it unpatched', () => {
    const kept = fixture(100, { universe: MAX_UNIVERSE - 1, address: 1, mode: 'Mode 1' });
    const plan = planPatches([kept, ...Array.from({ length: 52 }, (_, index) => fixture(index + 1))], undefined);
    expect([plan.autoPatched, plan.unplaced, plan.patches.get(51), plan.patches.has(52)]).toStrictEqual([
      51,
      1,
      { universe: MAX_UNIVERSE, address: 501, mode: 'Mode 1' },
      false,
    ]);
  });
});
