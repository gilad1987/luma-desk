import { describe, expect, it } from 'vitest';
import { colorByHeightOf, KEY_WHITE, LOOK_PALETTES, paletteOf } from '../../../src/show/mvrLook/lookPalette';
import { towers } from './lookRig';

describe('paletteOf', () => {
  it('gives one rig always the same pair and spreads rigs over the four pairs', () => {
    expect(paletteOf(248)).toBe(paletteOf(248));
    const names = [1, 2, 3, 4].map((count) => paletteOf(count).name);
    expect(names).toEqual(['red + cool white', 'deep blue + amber', 'congo + lavender', 'magenta + cyan']);
    expect(new Set(Array.from({ length: 40 }, (_, i) => paletteOf(i + 1))).size).toBe(4);
    expect(paletteOf(NaN)).toBe(LOOK_PALETTES[0]);
  });

  it('tones in a deep saturated primary and keys in a warm white', () => {
    for (const { primary } of LOOK_PALETTES) {
      expect(Math.max(primary.r, primary.g, primary.b)).toBe(100);
      expect(Math.min(primary.r, primary.g, primary.b)).toBeLessThanOrEqual(10);
    }
    expect([KEY_WHITE.r > KEY_WHITE.g, KEY_WHITE.g > KEY_WHITE.b]).toEqual([true, true]);
  });

  it('alternates the two colours up a tower, the same on both sides', () => {
    const units = towers(1, 'spot', 3);
    const { primary, accent } = paletteOf(6);
    const color = colorByHeightOf(units, paletteOf(6));
    expect(units.map((f, k) => color(f, k, units.length))).toEqual([accent, accent, primary, primary, accent, accent]);
  });
});
