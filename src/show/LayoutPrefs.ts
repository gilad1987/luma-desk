import { clamp } from '../core';
import type { KeyValueStore } from './KeyValueStore';
import { STORAGE_KEYS } from './storageKeys';

/** The desk layout the operator chose; `maSize` undefined means "adaptive", the size follows the window. */
export interface DeskLayout {
  deskMode: string;
  deskZoom: string;
  maSize: number | undefined;
}

type StoredLayout = { deskMode?: string; deskZoom?: string; maSize?: unknown } | null;

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
      // storage full or blocked: the layout is not kept
    }
  }

  /**
   * The saved layout, or null when none is saved or it cannot be read. A saved size equal to `adaptiveSize` reads as
   * adaptive: older versions saved that default without a grip drag (known quirk). Other sizes are clamped to 0.3-0.7.
   */
  load(adaptiveSize: number): DeskLayout | null {
    try {
      const saved = JSON.parse(this.#store.getItem(STORAGE_KEYS.layout) || 'null') as StoredLayout;
      if (!saved) return null;
      const size = Number(saved.maSize);
      const custom = Number.isFinite(size) && size > 0 && size !== adaptiveSize;
      return {
        deskMode: saved.deskMode || 'ma',
        deskZoom: saved.deskZoom || 'auto',
        maSize: custom ? clamp(size, 0.3, 0.7) : undefined,
      };
    } catch {
      return null;
    }
  }
}
