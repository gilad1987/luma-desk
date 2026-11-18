/** Owns the keyword table that suggests a desk type from a GDTF or fixture name: word matching and precedence. */
import { describe, expect, it } from 'vitest';
import { typeFromKeywords } from '../../../src/mvr/gdtf/typeFromKeywords.ts';

describe('typeFromKeywords', () => {
  it.each([
    ['Acme@Orbit Spot 400', 'spot'],
    ['Acme@Orbit Profile', 'profile'],
    ['Acme@Orbit Follow 2500', 'follow'],
    ['Acme@Orbit Hybrid', 'spot'],
    ['Acme@Orbit Wash 19', 'wash'],
    ['Acme@Orbit Beam 7R', 'beam'],
    ['Acme@Glow Bar 12', 'bar'],
    ['Acme@Glow Batten', 'bar'],
    ['Acme@Glow Dot', 'bar'],
    ['Acme@Glow Pixel', 'bar'],
    ['Acme@Glow Line 1m', 'bar'],
    ['Acme@Flash Strobe', 'strobe'],
    ['Acme@Flash Blinder 2', 'blinder'],
    ['Acme@Glow Par 64', 'par'],
  ] as const)('maps "%s" to %s', (name, type) => {
    expect(typeFromKeywords(name)).toBe(type);
  });

  it('ignores case and finds words split by digits, punctuation, underscores or camel case', () => {
    expect(
      ['acme@orbit SPOT', 'Acme_WASH_1', 'Acme@Par64', 'Acme@LEDBeam 150', 'Acme@SixBar'].map(typeFromKeywords),
    ).toEqual(['spot', 'wash', 'par', 'beam', 'bar']);
  });

  it('matches whole words only, so "par" in "sparkle" or "bar" in "barrel" is no match', () => {
    expect(
      ['Acme@Sparkle', 'Acme@Barrel', 'Acme@Spotless', 'Acme@Washer', 'Acme@Outline'].map(typeFromKeywords),
    ).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });

  it('splits an all-caps word made of two known words, or of "led" and a known word', () => {
    expect(
      ['Acme@LEDBAR 12', 'Acme@PIXELLINE', 'Acme@MEGA DOTLINE(TB 10 INT)', 'Acme@LEDPAR 7'].map(typeFromKeywords),
    ).toEqual(['bar', 'bar', 'bar', 'par']);
  });

  it('finds no compound in a word that is not two known words: a spotlight is a lamp, not a moving spot', () => {
    expect(['Acme@Sparkle', 'Acme@Spotlight', 'Acme@LEDS', 'Acme@Parade'].map(typeFromKeywords)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('reads dot and pixel as light words, after the body and moving-head words', () => {
    expect(['Acme@Pixel Wash', 'Acme@Dot Spot', 'Acme@Pixel Par', 'Acme@MagicDot-R'].map(typeFromKeywords)).toEqual([
      'wash',
      'spot',
      'par',
      'bar',
    ]);
  });

  it('matches only the product part after the first "@", not the maker', () => {
    expect(['Pixel Range@Orbit 5', 'Bar Co@Orbit Wash', 'Acme@Strobe@Par'].map(typeFromKeywords)).toEqual([
      undefined,
      'wash',
      'strobe',
    ]);
  });

  it('gives body words (strobe, blinder, par, bar group) precedence over light words, in table order', () => {
    expect(
      ['Acme@Wash Par', 'Acme@Beam Bar', 'Acme@Hybrid Strobe', 'Acme@Strobe Blinder', 'Acme@Pixel Par'].map(
        typeFromKeywords,
      ),
    ).toEqual(['par', 'bar', 'strobe', 'strobe', 'par']);
    expect(['Acme@Pixel Bar', 'Acme@PixelLine', 'Acme@Follow Spot'].map(typeFromKeywords)).toEqual([
      'bar',
      'bar',
      'follow',
    ]);
    expect(['Acme@Beam Wash', 'Acme@Wash Spot', 'Acme@Spot Hybrid'].map(typeFromKeywords)).toEqual([
      'beam',
      'wash',
      'spot',
    ]);
  });
});
