/**
 * Reading and writing the saved layout (`lumadesk-layout2`). Covers the parsing rules only; applying a layout to the
 * page is DOM work that the Playwright parity suite checks.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadLayout, saveLayout, toLayoutMode } from '../../../../src/ui/layouts/layoutStorage';

const KEY = 'lumadesk-layout2';

function stubStorage(stored: string | null): Map<string, string> {
  const map = new Map<string, string>(stored === null ? [] : [[KEY, stored]]);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
  });
  return map;
}

afterEach(() => vi.unstubAllGlobals());

describe('layout storage', () => {
  it('keeps an unknown stored layout name as it is, so the select shows no option and the page is classic', () => {
    const map = stubStorage(JSON.stringify({ deskMode: 'tablet', deskZoom: '.85' }));
    const loaded = loadLayout();
    saveLayout(loaded);
    expect([loaded.mode, toLayoutMode(loaded.mode), loaded.zoom, map.get(KEY)]).toEqual([
      'tablet',
      'classic',
      '.85',
      '{"deskMode":"tablet","deskZoom":".85"}',
    ]);
  });

  it('falls back to the MA console at auto zoom for empty fields or broken JSON', () => {
    stubStorage(JSON.stringify({ deskMode: '', deskZoom: '' }));
    const empty = loadLayout();
    stubStorage('{broken');
    expect([empty, loadLayout()]).toEqual([
      { mode: 'ma', zoom: 'auto', maSize: undefined },
      { mode: 'ma', zoom: 'auto', maSize: undefined },
    ]);
  });

  it('reads a stored grip size equal to the default as adaptive and clamps the others', () => {
    stubStorage(JSON.stringify({ deskMode: 'ma', maSize: 0.47 }));
    const atDefault = loadLayout().maSize;
    stubStorage(JSON.stringify({ deskMode: 'ma', maSize: 0.9 }));
    expect([atDefault, loadLayout().maSize]).toEqual([undefined, 0.7]);
  });
});
