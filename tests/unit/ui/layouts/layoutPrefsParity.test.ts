/**
 * The saved layout (`lumadesk-layout2`) as the layouts read it through LayoutPrefs: the parity cases for values a real
 * desk writes. Applying a layout to the page is DOM work that the Playwright parity suite checks.
 */
import { describe, expect, it } from 'vitest';
import { LayoutPrefs, STORAGE_KEYS, type KeyValueStore } from '../../../../src/show';
import { MA_SIZE, zoomFactor } from '../../../../src/ui/layouts/fitMath';
import { toLayoutMode } from '../../../../src/ui/layouts/toLayoutMode';

/** LayoutPrefs over an in-memory store holding `stored` under the layout key (nothing when null). */
function prefsWith(stored: string | null): { prefs: LayoutPrefs; items: Map<string, string> } {
  const items = new Map<string, string>(stored === null ? [] : [[STORAGE_KEYS.layout, stored]]);
  const store: KeyValueStore = { getItem: (k) => items.get(k) ?? null, setItem: (k, v) => void items.set(k, v) };
  return { prefs: new LayoutPrefs(store), items };
}

describe('saved layout parity', () => {
  it('keeps an unknown saved layout name, so the select shows no option and the page is classic', () => {
    const { prefs, items } = prefsWith(JSON.stringify({ deskMode: 'tablet', deskZoom: '.85' }));
    const loaded = prefs.load(MA_SIZE);
    if (!loaded) throw new Error('the saved layout did not load');
    prefs.save(loaded);
    expect([loaded.deskMode, toLayoutMode(loaded.deskMode), zoomFactor(loaded.deskZoom, 1000, 1880, 0.66)]).toEqual([
      'tablet',
      'classic',
      0.85,
    ]);
    expect(items.get(STORAGE_KEYS.layout)).toBe('{"deskMode":"tablet","deskZoom":".85"}');
  });

  it('round-trips the values the selects and the grip write', () => {
    const { prefs, items } = prefsWith(null);
    prefs.save({ deskMode: 'desk', deskZoom: '0.85', maSize: 0.55 });
    expect(items.get(STORAGE_KEYS.layout)).toBe('{"deskMode":"desk","deskZoom":"0.85","maSize":0.55}');
    expect(prefs.load(MA_SIZE)).toEqual({ deskMode: 'desk', deskZoom: '0.85', maSize: 0.55 });
  });

  it('falls back to the MA console at auto zoom for empty fields', () => {
    const { prefs } = prefsWith(JSON.stringify({ deskMode: '', deskZoom: '' }));
    expect(prefs.load(MA_SIZE)).toEqual({ deskMode: 'ma', deskZoom: 'auto', maSize: undefined });
  });

  it('maps only the two console names to a console', () => {
    expect(['ma', 'desk', 'classic', 'tablet', ''].map(toLayoutMode)).toEqual([
      'ma',
      'desk',
      'classic',
      'classic',
      'classic',
    ]);
  });
});
