import { describe, expect, it } from 'vitest';
import { decodeAbsolute, patchFromAddresses } from '../../../src/mvr/patch/address.ts';
import type { MvrAddress } from '../../../src/mvr/scene/MvrScene.ts';

const address = (value: string, dmxBreak = 0): MvrAddress => ({ dmxBreak, value });

describe('patchFromAddresses', () => {
  it.each([
    ['1', 1, 1],
    ['512', 1, 512],
    ['513', 2, 1],
    ['1025', 3, 1],
    ['2.1', 2, 1],
    [' 3.512 ', 3, 512],
  ])('reads %j as universe %i, address %i', (value, universe, addr) => {
    expect(patchFromAddresses([address(value)], 'F1')).toEqual({ patch: { universe, address: addr }, warnings: [] });
  });

  it.each(['0', '', '  '])('treats %j as unpatched, without a warning', (value) => {
    expect(patchFromAddresses([address(value)], 'F1')).toEqual({ warnings: [] });
  });

  it('treats a fixture without addresses as unpatched, without a warning', () => {
    expect(patchFromAddresses([], 'F1')).toEqual({ warnings: [] });
  });

  it('keeps the lowest break and gives one multi-break warning', () => {
    const result = patchFromAddresses([address('100', 2), address('1', 0), address('50', 1), address('60', 3)], 'F1');
    expect(result.patch).toEqual({ universe: 1, address: 1 });
    expect(result.warnings.map((warning) => [warning.code, warning.ref])).toEqual([['multi-break', 'F1']]);
  });

  it.each(['abc', '1.2.3', '-5', '1e3', '1.0', '1.513', '0.1'])(
    'warns bad-address for %j and gives no patch',
    (value) => {
      const result = patchFromAddresses([address(value)], 'F1');
      expect(result.patch).toBeUndefined();
      expect(result.warnings.map((warning) => [warning.code, warning.ref])).toEqual([['bad-address', 'F1']]);
    },
  );
});

describe('decodeAbsolute', () => {
  it.each([
    ['513', 513],
    [' 2.5 ', 517],
    ['0', 0],
    [String(63999 * 512), 63999 * 512],
  ])('decodes %j as %i', (text, absolute) => {
    expect(decodeAbsolute(text)).toBe(absolute);
  });

  it.each(['abc', '1.600', '0.1', '64000.1', String(63999 * 512 + 1), ''])('rejects %j', (text) => {
    expect(decodeAbsolute(text)).toBeUndefined();
  });
});
