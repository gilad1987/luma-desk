import { describe, expect, it } from 'vitest';
import { colorByName } from '../../../../src/engine/colorByName';
import { COLORS } from '../../../../src/engine/presetColors';

describe('colorByName', () => {
  it('returns every preset colour as r, g, b in that key order', () => {
    for (const [name, r, g, b] of COLORS) {
      const color = colorByName(name);
      expect(color).toStrictEqual({ r, g, b });
      expect(Object.keys(color)).toEqual(['r', 'g', 'b']);
    }
  });

  it('throws on a name that is not a preset colour', () => {
    expect(() => colorByName('Mauve')).toThrow('Unknown preset colour "Mauve"');
  });
});
