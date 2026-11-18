import { describe, expect, it } from 'vitest';
import { findGdtfMatch } from '../../../src/mvr/gdtf/findGdtf.ts';

const NAMES = [
  'GeneralSceneDescription.xml',
  'Robe Spiider.gdtf',
  'robe spiider',
  'Chauvet Professional@COLORado PXL Bar 16.gdtf',
  'Custom@Par 64',
];

describe('findGdtfMatch file', () => {
  it('takes an exact name first, even when a case-insensitive name also matches', () => {
    expect(findGdtfMatch(NAMES, 'robe spiider')?.file).toBe('robe spiider');
  });

  it('adds the .gdtf extension', () => {
    expect(findGdtfMatch(NAMES, 'Robe Spiider')?.file).toBe('Robe Spiider.gdtf');
  });

  it('ignores case, with and without the extension', () => {
    expect(findGdtfMatch(NAMES, 'ROBE SPIIDER.GDTF')?.file).toBe('Robe Spiider.gdtf');
    expect(findGdtfMatch(['Robe Spiider.gdtf'], 'ROBE SPIIDER')?.file).toBe('Robe Spiider.gdtf');
  });

  it('matches the part after @ of an archive name (the Vectorworks COLORado case)', () => {
    expect(findGdtfMatch(NAMES, 'COLORado PXL Bar 16')?.file).toBe('Chauvet Professional@COLORado PXL Bar 16.gdtf');
    expect(findGdtfMatch(NAMES, 'colorado pxl bar 16.gdtf')?.file).toBe(
      'Chauvet Professional@COLORado PXL Bar 16.gdtf',
    );
  });

  it('matches the part after @ of an archive name without extension', () => {
    expect(findGdtfMatch(NAMES, 'Par 64')?.file).toBe('Custom@Par 64');
  });

  it('gives undefined for a missing GDTF and for an empty spec', () => {
    expect(findGdtfMatch(NAMES, 'SUPER DOTLINE(TB 1060 INT)')?.file).toBeUndefined();
    expect(findGdtfMatch(NAMES, 'MAC Axiom Hybrid')?.file).toBeUndefined();
    expect(findGdtfMatch(NAMES, '')?.file).toBeUndefined();
    expect(findGdtfMatch([], 'Robe Spiider')?.file).toBeUndefined();
  });

  it('does not match a part of a name', () => {
    expect(findGdtfMatch(NAMES, 'PXL Bar 16')?.file).toBeUndefined();
    expect(findGdtfMatch(NAMES, 'Chauvet Professional')?.file).toBeUndefined();
  });
});
