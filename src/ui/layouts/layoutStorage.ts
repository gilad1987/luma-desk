import type { LayoutMode } from '../panels/layoutMode';
import { clamp } from '../../core';
import type { LayoutSettings } from './DeskFit';
import { MA_SIZE } from './fitMath';

const STORAGE_KEY = 'lumadesk-layout2';

/** The layout a stored or selected name shows: anything but the two consoles shows the classic page, as before. */
export const toLayoutMode = (v: string): LayoutMode => (v === 'ma' || v === 'desk' ? v : 'classic');

/**
 * The saved layout, or the MA console at auto zoom. An unknown name is kept as it is (the select then shows no option
 * and the page is classic, as before). A stored grip size equal to `MA_SIZE` reads as adaptive (known quirk Q33).
 */
export function loadLayout(): LayoutSettings {
  const settings: LayoutSettings = { mode: 'ma', zoom: 'auto', maSize: undefined };
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!stored || typeof stored !== 'object') return settings;
    const l = stored as Record<string, unknown>;
    const s = Number(l['maSize']);
    return {
      mode: storedText(l['deskMode'], 'ma'),
      zoom: storedText(l['deskZoom'], 'auto'),
      maSize: Number.isFinite(s) && s > 0 && s !== MA_SIZE ? clamp(s, 0.3, 0.7) : undefined,
    };
  } catch {
    return settings;
  }
}

/** A stored select value, or `fallback` when it is empty, the same `value || fallback` rule as before. */
function storedText(v: unknown, fallback: string): string {
  if (typeof v === 'string' || typeof v === 'number') return v ? String(v) : fallback;
  return fallback;
}

/** Saves the layout under the key and field names earlier versions used. */
export function saveLayout(s: LayoutSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ deskMode: s.mode, deskZoom: s.zoom, maSize: s.maSize }));
  } catch {
    // storage blocked: the layout is not remembered, as before
  }
}
