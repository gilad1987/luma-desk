import { clamp } from '../../core';
import type { LayoutSettings } from './DeskFit';
import { MA_SIZE } from './fitMath';

const STORAGE_KEY = 'lumadesk-layout2';

/** A stored layout name; anything other than the two consoles shows the classic page, as before. */
export const toLayoutMode = (v: string): LayoutSettings['mode'] => (v === 'ma' || v === 'desk' ? v : 'classic');

/**
 * The saved layout, or the MA console at auto zoom. A stored grip size equal to `MA_SIZE` came from versions that
 * saved the default without a drag, so it reads as "adaptive" (known quirk Q33).
 */
export function loadLayout(): LayoutSettings {
  const settings: LayoutSettings = { mode: 'ma', zoom: 'auto', maSize: undefined };
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!stored || typeof stored !== 'object') return settings;
    const l = stored as Record<string, unknown>;
    const s = Number(l.maSize);
    return {
      mode: toLayoutMode(typeof l.deskMode === 'string' && l.deskMode ? l.deskMode : 'ma'),
      zoom: typeof l.deskZoom === 'string' && l.deskZoom ? l.deskZoom : 'auto',
      maSize: Number.isFinite(s) && s > 0 && s !== MA_SIZE ? clamp(s, 0.3, 0.7) : undefined,
    };
  } catch {
    return settings;
  }
}

/** Saves the layout under the key and field names earlier versions used. */
export function saveLayout(s: LayoutSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ deskMode: s.mode, deskZoom: s.zoom, maSize: s.maSize }));
  } catch {
    // storage blocked: the layout is not remembered, as before
  }
}
