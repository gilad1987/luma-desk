/**
 * Review R2-10: a fixture that mixes colour with channels the optics do not describe (RGB, HSB, CIE, macros) is no
 * single-colour unit, so its file colour is no fixed gel. A show saved before the fact existed reads as before.
 */
import { describe, expect, it } from 'vitest';
import type { MvrDesignInfo, MvrFixtureInfo } from '../../../src/domain/stage/mvr.ts';
import { fileGelOf, isSingleColour } from '../../../src/domain/stage/mvrGel.ts';
import type { GdtfChannel } from '../../../src/mvr/gdtf/GdtfInfo.ts';
import { mixesColour } from '../../../src/mvr/gdtf/mixesColour.ts';

const channels = (...attributes: string[]): GdtfChannel[] =>
  attributes.map((attribute) => ({ attribute }) as GdtfChannel);

const RED = { xyY: [0.64, 0.33, 21.26], rgb: [1, 0, 0] };
const WHITE = { xyY: [0.3127, 0.329, 100], rgb: [1, 1, 1] };
const info = (extra: Partial<MvrFixtureInfo> = {}): MvrFixtureInfo => ({
  uuid: 'F1',
  layer: 'L',
  gdtfName: 'G',
  gdtfMode: 'M',
  type: 'par',
  optics: {},
  color: 0,
  ...extra,
});
const design = { colors: [RED, WHITE], fixtures: {}, layers: [], hiddenLayers: [], offset: [0, 0, 0] } as never;

describe('colour channels beyond the optics (R2-10)', () => {
  it.each(['ColorRGB_Red', 'HSB_Hue', 'CIE_X', 'ColorMacro1'])('%s mixes colour', (attribute) => {
    expect(mixesColour(channels('Dimmer', attribute))).toBe(true);
  });

  it('a dimmer with a colour wheel or CTO only is no unmodelled colour mix', () => {
    expect(mixesColour(channels('Dimmer', 'Color1', 'CTO', 'ColorAdd_R'))).toBe(false);
  });

  it('a unit with such channels is not single-colour and gets no gel', () => {
    expect(isSingleColour(info({ mixesColour: true }))).toBe(false);
    expect(fileGelOf(design as MvrDesignInfo, info({ mixesColour: true }))).toBeUndefined();
  });

  it('a saved fixture without the fact counts as before: single-colour, with the file colour as its gel', () => {
    expect(isSingleColour(info())).toBe(true);
    expect(fileGelOf(design as MvrDesignInfo, info())).toEqual([100, 0, 0]);
  });
});
