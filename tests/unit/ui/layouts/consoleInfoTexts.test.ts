/** The console info label texts. The 250 ms timer and the label writes are DOM work for the parity suite. */
import { describe, expect, it } from 'vitest';
import { deskInfoTexts, maInfoTexts } from '../../../../src/ui/layouts/consoleInfoTexts';

const state = { sideTab: 'sheet', feature: 'pos', selected: 3, execIndex: 0, execName: '' };

describe('console info texts', () => {
  it('writes the MA headers with the feature label and a bare executor without a name', () => {
    expect(maInfoTexts(state)).toEqual({ d1: 'SHEET', d2: 'POSITION · 3 SEL', d3: 'EXEC 1 ' });
  });

  it('writes the desk labels and calls an unnamed executor empty', () => {
    expect(deskInfoTexts(state)).toEqual({ playback: 'EXEC 1 · empty', programmer: '3 SELECTED', screen: 'SHEET' });
  });
});
