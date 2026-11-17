/**
 * Reading and writing the saved layout (`lumadesk-layout2`). Covers the parsing rules only; applying a layout to the
 * page is DOM work that the Playwright parity suite checks.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { zoomFactor } from '../../../../src/ui/layouts/fitMath';
import { loadLayout, saveLayout, selectValue, toLayoutMode } from '../../../../src/ui/layouts/layoutStorage';

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

  it('keeps a corrupt truthy value with its JSON type: classic page, numeric zoom, saved back unchanged', () => {
    const map = stubStorage('{"deskMode":true,"deskZoom":true}');
    const loaded = loadLayout();
    saveLayout(loaded);
    expect([toLayoutMode(loaded.mode), zoomFactor(loaded.zoom, 1000, 1880, 0.66), map.get(KEY)]).toEqual([
      'classic',
      1,
      '{"deskMode":true,"deskZoom":true}',
    ]);
  });

  it('keeps an object or a number as the stored layout name and saves it back with the same type', () => {
    const objectMap = stubStorage('{"deskMode":{},"deskZoom":{}}');
    const object = loadLayout();
    saveLayout(object);
    const savedObject = objectMap.get(KEY);
    const map = stubStorage('{"deskMode":5,"deskZoom":0.85}');
    const number = loadLayout();
    saveLayout(number);
    expect([toLayoutMode(object.mode), zoomFactor(object.zoom, 1000, 1880, 0.66), savedObject]).toEqual([
      'classic',
      NaN,
      '{"deskMode":{},"deskZoom":{}}',
    ]);
    expect([toLayoutMode(number.mode), map.get(KEY)]).toEqual(['classic', '{"deskMode":5,"deskZoom":0.85}']);
  });

  it('falls back for falsy stored values of any type', () => {
    stubStorage('{"deskMode":0,"deskZoom":false}');
    expect(loadLayout()).toEqual({ mode: 'ma', zoom: 'auto', maSize: undefined });
  });

  it('gives the selects the text the old `select.value = value` assignment made', () => {
    expect([selectValue(true), selectValue({}), selectValue(5), selectValue('ma')]).toEqual([
      'true',
      '[object Object]',
      '5',
      'ma',
    ]);
  });
});
