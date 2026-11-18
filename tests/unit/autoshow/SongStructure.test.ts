import { describe, expect, it } from 'vitest';
import { pumpLevel } from '../../../src/autoshow/pumpLevel';
import { sectionName } from '../../../src/autoshow/sections';
import {
  barsPerLook,
  beatPosition,
  isLookChangeBar,
  sectionAt,
  sectionEnergy,
} from '../../../src/autoshow/SongStructure';
import { STYLES } from '../../../src/autoshow/styles';

describe('SongStructure', () => {
  it('walks the style section cycle by look index', () => {
    expect([0, 1, 2, 3, 4].map((i) => sectionAt(STYLES.edm, i))).toEqual([
      'groove',
      'groove',
      'build',
      'drop',
      'groove',
    ]);
    expect(sectionAt(STYLES.rock, 3)).toBe('chorus');
  });

  it('plays intro at 0.8 because the energy table has no intro (quirk E5)', () => {
    expect(sectionEnergy('intro')).toBe(0.8);
    expect(sectionEnergy('verse')).toBe(0.65);
    expect(sectionName('intro')).toBe('Intro');
    expect(sectionName(undefined)).toBeUndefined();
    expect(sectionName('outro')).toBeUndefined();
  });

  it("uses the operator's bars, or the style's when the setting is 0", () => {
    expect(barsPerLook(STYLES.ballad, 0)).toBe(16);
    expect(barsPerLook(STYLES.ballad, 2)).toBe(2);
  });

  it('keeps the look cycle on negative bars with the double modulo', () => {
    expect([-8, -4, -3, 0, 3, 4, 8].map((bar) => isLookChangeBar(bar, 4))).toEqual([
      true,
      true,
      false,
      true,
      false,
      true,
      true,
    ]);
  });

  it('computes beats, beat and bar from the tempo grid, also before the origin', () => {
    expect(beatPosition(11.25, { bpm: 120, beatOrigin: 10 })).toEqual({ beats: 2.5, beat: 2, bar: 0 });
    expect(beatPosition(9, { bpm: 120, beatOrigin: 10 })).toEqual({ beats: -2, beat: -2, bar: -1 });
  });
});

describe('pumpLevel', () => {
  it('decays from full on each beat in beat mode', () => {
    expect(pumpLevel('beat', 0, () => 0.5)).toBe(1);
    expect(pumpLevel('beat', 0.5, () => 0.5)).toBe(0.45 + 0.55 * Math.exp(-2.5));
  });

  it('follows the squared bass in audio mode and stays at 1 without an analyser', () => {
    expect(pumpLevel('audio', 0, () => 0.5)).toBeCloseTo(0.4, 15);
    expect(pumpLevel('audio', 0, () => null)).toBe(1);
  });

  it('never reads the bass outside audio mode, because a read moves the peak', () => {
    let reads = 0;
    const bass = () => (reads++, 1);
    expect(pumpLevel('off', 0.3, bass)).toBe(1);
    pumpLevel('beat', 0.3, bass);
    expect(reads).toBe(0);
  });
});
