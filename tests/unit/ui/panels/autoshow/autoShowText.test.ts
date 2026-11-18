import { describe, expect, it } from 'vitest';
import { STYLES } from '../../../../../src/autoshow/styles';
import { COLORS } from '../../../../../src/engine/presetColors';
import { autoShowMarkup } from '../../../../../src/ui/panels/autoshow/autoShowMarkup';
import {
  lookCountdown,
  runningStatus,
  songStatHtml,
  styleCardHtml,
} from '../../../../../src/ui/panels/autoshow/autoShowText';
import { legacyMarkup } from '../../../../shared/legacy';

/** The original `COL(n)` swatch maths, restated so the test does not lean on the code under test. */
const legacyRgb = (name: string): string => {
  const [, r, g, b] = COLORS.find((c) => c[0] === name) ?? ['', NaN, NaN, NaN];
  return `rgb(${r * 2.55},${g * 2.55},${b * 2.55})`;
};

describe('Auto Show text', () => {
  it('keeps the pane markup byte for byte', () => {
    // the oracle sits beside this test, in the folder this builder owns
    expect(autoShowMarkup).toBe(legacyMarkup('autoShow'));
  });

  it('draws a style card as the original renderAuto did', () => {
    const s = STYLES.techno,
      [a = '', b = ''] = s.pal[0] ?? [];
    expect(styleCardHtml(s, 'תג')).toBe(
      `<div class="sb" style="background:linear-gradient(90deg,${legacyRgb(a)},${legacyRgb(b)})"></div>` +
        `<b>${s.name}</b><span dir="rtl">תג</span>`,
    );
  });

  it('counts bars down with the plural rule and an empty section before the first look', () => {
    expect(lookCountdown('drop', 1)).toBe('Drop · next look in 1 bar');
    expect(lookCountdown('', 4)).toBe(' · next look in 4 bars');
  });

  it('writes the running status, printing an unknown section as undefined', () => {
    const s = STYLES.edm;
    const tail = `, fade ${s.fade}s, change every 8 bars.<br>Programmer still overrides Auto, so you can grab fixtures`;
    expect(runningStatus(s, 'verse', 8)).toBe(
      `<b>● AUTO RUNNING</b> — ${s.name}, section <b>Verse</b>${tail} live. Executor faders (HTP) add on top.`,
    );
    expect(runningStatus(s, '', 8)).toContain('section <b>undefined</b>');
  });

  it('rounds minutes and seconds separately, as the original did', () => {
    const acc = '<b style="color:var(--acc)">';
    expect(songStatHtml({ name: 'a.mp3', bpm: 128, duration: 89.6 })).toBe(
      `${acc}a.mp3</b> · detected ${acc}128 BPM</b> · 1:30`,
    );
  });
});
