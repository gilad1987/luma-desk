/**
 * A `ColorCIE` text with a blank part is no colour: `Number('')` is 0, so a missing Y read as black and a missing x
 * as a point on the edge of the diagram.
 */
import { describe, expect, it } from 'vitest';
import { parseColorCie } from '../../../src/mvr/gdtf/optics/cieColor.ts';

describe('parseColorCie with blank parts', () => {
  it.each([['0.3127,0.3290,'], [' ,0.3290,50'], ['0.3127,,50'], ['{0.3127, 0.3290, }']])('does not read %j', (text) => {
    expect(parseColorCie(text)).toBeUndefined();
  });

  it('still reads a full text with spaces and braces', () => {
    expect(parseColorCie('{0.3127, 0.3290, 100.0}')).toEqual([0.3127, 0.329, 100]);
  });
});
