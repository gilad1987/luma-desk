import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { encoderList } from '../../../../../src/ui/panels/encoders/encoderList';
import { encodersMarkup } from '../../../../../src/ui/panels/encoders/encodersMarkup';
import { encoderSpec, isPhaserParam } from '../../../../../src/ui/panels/encoders/encoderSpec';
import { formatEncoderValue } from '../../../../../src/ui/panels/encoders/formatEncoderValue';

// the oracle is index.html at 48a3b63, lines 606-609, from the first `<` to the last `>`
const legacy = readFileSync(new URL('./encoders.txt', import.meta.url), 'utf8');

describe('encoders markup', () => {
  it('equals the original page byte for byte', () => {
    expect(encodersMarkup).toBe(legacy);
  });
});

describe('encoderList (the old encList)', () => {
  it('shows only the feature encoders outside MA', () => {
    expect(encoderList('color', 'desk')).toEqual(['r', 'g', 'b']);
    expect(encoderList('fx', 'classic')).toEqual(['rate', 'size', 'spread']);
  });

  it('pads the MA row to five with the fixed fill order, skipping the feature encoders (Q20)', () => {
    expect(encoderList('dim', 'ma')).toEqual(['dim', 'pan', 'tilt', 'r', 'g']);
    expect(encoderList('pos', 'ma')).toEqual(['pan', 'tilt', 'dim', 'r', 'g']);
    expect(encoderList('fx', 'ma')).toEqual(['rate', 'size', 'spread', 'dim', 'pan']);
  });
});

describe('encoderSpec', () => {
  it('takes fixture attributes from ATTR and phaser parameters from the phaser table', () => {
    expect(isPhaserParam('spread')).toBe(true);
    expect(isPhaserParam('gobo')).toBe(false);
    expect(encoderSpec('spread')).toEqual({ label: 'Phase', min: 0, max: 1440, unit: '°' });
    expect(encoderSpec('gobo').step).toBe(1);
  });
});

describe('formatEncoderValue (the old fmtVal)', () => {
  it('shows a dash for no value', () => {
    expect(formatEncoderValue('dim', null, false)).toBe('—');
  });

  it('gives small non-dimmer values one decimal and appends the unit', () => {
    expect(formatEncoderValue('dim', 5.4, false)).toBe('5%');
    expect(formatEncoderValue('rate', 0.5, false)).toBe('0.5x');
    expect(formatEncoderValue('spread', 360, false)).toBe('360°');
    expect(formatEncoderValue('size', -3.25, false)).toBe('-3.3');
  });

  it('names the gobo slot, or the LED mode on a screen', () => {
    expect(formatEncoderValue('gobo', 2.6, false)).toBe('3 Star');
    expect(formatEncoderValue('gobo', 99, false)).toBe('99 ');
    expect(formatEncoderValue('gobo', 0, true)).not.toBe('0 Open');
  });
});
