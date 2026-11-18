import { clamp } from '../core';
import { isRecord } from './isRecord';
import type { KeyValueStore } from './KeyValueStore';
import { STORAGE_KEYS } from './storageKeys';

/** The desk layout the operator chose; `maSize` undefined means "adaptive", the size follows the window. */
export interface DeskLayout {
  deskMode: string;
  deskZoom: string;
  maSize: number | undefined;
}

/** Saves and restores the desk layout. Storage errors are dropped, as before: a lost layout only costs a click. */
export class LayoutPrefs {
  readonly #store: KeyValueStore;

  constructor(store: KeyValueStore) {
    this.#store = store;
  }

  /** Saves the layout; the key order (deskMode, deskZoom, maSize) is what older versions read. */
  save({ deskMode, deskZoom, maSize }: DeskLayout): void {
    try {
      this.#store.setItem(STORAGE_KEYS.layout, JSON.stringify({ deskMode, deskZoom, maSize }));
    } catch {
      // quirk D6 (orig:2941): storage full or blocked, so the layout is not kept
    }
  }

  /**
   * The saved layout, or null when none is saved or it cannot be read. A saved size equal to `adaptiveSize` reads as
   * adaptive: older versions saved that default without a grip drag (quirk D7). Other sizes are clamped to 0.3-0.7.
   */
  load(adaptiveSize: number): DeskLayout | null {
    try {
      const saved: unknown = JSON.parse(this.#store.getItem(STORAGE_KEYS.layout) || 'null');
      if (!saved) return null;
      const { deskMode, deskZoom, maSize } = isRecord(saved) ? saved : {};
      const size = Number(maSize);
      const custom = Number.isFinite(size) && size > 0 && size !== adaptiveSize; // quirk D7, quirk Q33 (orig:3082)
      return {
        deskMode: textOr(deskMode, 'ma'), // quirk D9 (orig:3080): an unknown name is kept
        deskZoom: textOr(deskZoom, 'auto'),
        maSize: custom ? clamp(size, 0.3, 0.7) : undefined,
      };
    } catch {
      return null;
    }
  }
}

/** A saved mode name, or the default when it is missing, empty or not text. */
function textOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback;
}
