/**
 * `toAbsoluteAddress` is the inverse of the address decoding in `patchFromAddresses`; an off-by-one in the universe
 * step patches every exported fixture one channel or one universe away. Out-of-range input must throw, not wrap.
 */
import { describe, expect, it } from 'vitest';
import { patchFromAddresses, toAbsoluteAddress, type DmxAddress } from '../../../../src/mvr/patch/address.ts';

const POINTS: readonly DmxAddress[] = [
  { universe: 1, address: 1 },
  { universe: 1, address: 512 },
  { universe: 2, address: 1 },
  { universe: 7, address: 300 },
  { universe: 64, address: 512 },
];

describe('toAbsoluteAddress', () => {
  it.each(POINTS)('decodes back through patchFromAddresses to universe $universe address $address', (point) => {
    const value = String(toAbsoluteAddress(point));
    expect(patchFromAddresses([{ dmxBreak: 0, value }], 'F1')).toStrictEqual({ patch: point, warnings: [] });
  });

  it('counts across universes in steps of 512', () => {
    expect([toAbsoluteAddress({ universe: 1, address: 1 }), toAbsoluteAddress({ universe: 3, address: 2 })]).toEqual([
      1, 1026,
    ]);
  });

  it.each([
    { universe: 0, address: 1 },
    { universe: 1, address: 0 },
    { universe: 1, address: 513 },
    { universe: 1, address: 1.5 },
  ])('throws a RangeError for universe $universe address $address', (point) => {
    expect(() => toAbsoluteAddress(point)).toThrow(RangeError);
  });
});
