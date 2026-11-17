import type { LayoutMode } from '../panels/layoutMode';
import { clamp } from '../../core';
import type { LayoutSettings } from './DeskFit';
import { MA_SIZE } from './fitMath';
import type { StoredSetting } from './StoredSetting';

const STORAGE_KEY = 'lumadesk-layout2';

/** The layout a stored or selected name shows: anything but the two consoles shows the classic page, as before. */
export const toLayoutMode = (v: StoredSetting): LayoutMode => (v === 'ma' || v === 'desk' ? v : 'classic');

/**
 * The saved layout, or the MA console at auto zoom. Any truthy stored value is kept as it is, with its JSON type (the
 * select then shows no option, the page is classic and the zoom is `Number(value)`, as before). A stored grip size equal to `MA_SIZE` reads as adaptive (known quirk Q33).
 */
export function loadLayout(): LayoutSettings {
  const settings: LayoutSettings = { mode: 'ma', zoom: 'auto', maSize: undefined };
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!stored || typeof stored !== 'object') return settings;
    const l = stored as Record<string, unknown>;
    const s = Number(l['maSize']);
    return {
      mode: storedOr(l['deskMode'], 'ma'),
      zoom: storedOr(l['deskZoom'], 'auto'),
      maSize: Number.isFinite(s) && s > 0 && s !== MA_SIZE ? clamp(s, 0.3, 0.7) : undefined,
    };
  } catch {
    return settings;
  }
}

/** The stored value, or `fallback` when it is falsy: the same `value || fallback` rule as before. */
function storedOr(v: unknown, fallback: string): StoredSetting {
  if (!v) return fallback;
  // JSON.parse yields nothing else; the guard narrows `unknown` without a cast
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'object'
    ? v
    : fallback;
}

/** The text a select gets for a stored value: the conversion the old `select.value = value` made. */
export function selectValue(v: StoredSetting): string {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- a corrupt `{}` reads '[object Object]', as before
  return String(v);
}

/** Saves the layout under the key and field names earlier versions used. */
export function saveLayout(s: LayoutSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ deskMode: s.mode, deskZoom: s.zoom, maSize: s.maSize }));
  } catch {
    // storage blocked: the layout is not remembered, as before
  }
}
